/**
 * Captures docs/demo.html as a high-quality MP4 video.
 *
 * Overrides browser timing APIs (setTimeout, requestAnimationFrame,
 * performance.now) with a manual clock, then advances it frame-by-frame.
 * This ensures animations play at the correct speed regardless of how
 * long each screenshot takes.
 *
 * Usage:
 *   npm install                  # install puppeteer (once)
 *   node docs/capture-demo.js    # run from project root
 *
 * Requirements: ffmpeg, node >=18
 * Output: docs/demo.mp4
 */

var puppeteer = require('puppeteer');
var path = require('path');
var fs = require('fs');
var { execFileSync } = require('child_process');

var WIDTH = 1920;
var HEIGHT = 1080;
var FPS = 60;
var DURATION_SEC = 24;
var FRAME_MS = 1000 / FPS; // ~16.67ms per frame
var FRAMES_DIR = path.join(__dirname, '.demo-frames');
var OUTPUT = path.join(__dirname, 'demo.mp4');
var DEMO_FILE = path.join(__dirname, 'demo.html');

async function main() {
  // Clean / create frames dir
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR);

  console.log('Launching browser...');
  var browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--window-size=' + WIDTH + ',' + HEIGHT,
    ],
  });

  var page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
  });

  // Inject time control BEFORE page scripts run
  // This overrides setTimeout, setInterval, requestAnimationFrame, and
  // performance.now to use a manual clock we advance per frame.
  await page.evaluateOnNewDocument(function () {
    window.__virtualTime = 0;
    window.__pendingTimers = [];
    window.__nextTimerId = 1;
    window.__pendingRAFs = [];

    // Override performance.now
    var origPerfNow = performance.now.bind(performance);
    performance.now = function () { return window.__virtualTime; };

    // Override Date.now
    var startReal = Date.now();
    Date.now = function () { return startReal + window.__virtualTime; };

    // Override setTimeout
    window.setTimeout = function (fn, delay) {
      var id = window.__nextTimerId++;
      window.__pendingTimers.push({ id: id, fn: fn, fireAt: window.__virtualTime + (delay || 0) });
      return id;
    };

    // Override setInterval
    window.setInterval = function (fn, interval) {
      var id = window.__nextTimerId++;
      window.__pendingTimers.push({ id: id, fn: fn, fireAt: window.__virtualTime + (interval || 0), interval: interval });
      return id;
    };

    // Override clearTimeout / clearInterval
    window.clearTimeout = window.clearInterval = function (id) {
      window.__pendingTimers = window.__pendingTimers.filter(function (t) { return t.id !== id; });
    };

    // Override requestAnimationFrame
    window.requestAnimationFrame = function (fn) {
      var id = window.__nextTimerId++;
      window.__pendingRAFs.push({ id: id, fn: fn });
      return id;
    };
    window.cancelAnimationFrame = function (id) {
      window.__pendingRAFs = window.__pendingRAFs.filter(function (r) { return r.id !== id; });
    };

    // Called from Puppeteer to advance the clock
    window.__advanceTime = function (ms) {
      window.__virtualTime += ms;

      // Fire matured timers
      var ready = [];
      var remaining = [];
      for (var i = 0; i < window.__pendingTimers.length; i++) {
        var t = window.__pendingTimers[i];
        if (t.fireAt <= window.__virtualTime) {
          ready.push(t);
        } else {
          remaining.push(t);
        }
      }
      window.__pendingTimers = remaining;

      ready.sort(function (a, b) { return a.fireAt - b.fireAt; });
      for (var j = 0; j < ready.length; j++) {
        try { ready[j].fn(); } catch (e) {}
        // Re-schedule intervals
        if (ready[j].interval) {
          window.__pendingTimers.push({
            id: ready[j].id,
            fn: ready[j].fn,
            fireAt: window.__virtualTime + ready[j].interval,
            interval: ready[j].interval
          });
        }
      }

      // Fire all pending rAFs
      var rafs = window.__pendingRAFs.slice();
      window.__pendingRAFs = [];
      for (var k = 0; k < rafs.length; k++) {
        try { rafs[k].fn(window.__virtualTime); } catch (e) {}
      }
    };
  });

  // Now load the page normally — scripts will use our virtual clock
  await page.goto('file://' + DEMO_FILE, { waitUntil: 'load', timeout: 15000 });

  // Small real pause to let fonts/CSS settle
  await new Promise(function (r) { setTimeout(r, 500); });

  var totalFrames = FPS * DURATION_SEC;
  console.log('Capturing ' + totalFrames + ' frames at ' + FPS + 'fps (' + DURATION_SEC + 's)...');

  for (var i = 0; i < totalFrames; i++) {
    // Advance virtual clock and fire pending timers/rafs
    await page.evaluate(function (ms) {
      window.__advanceTime(ms);
    }, FRAME_MS);

    // Small real-time pause to let CSS transitions/rendering settle
    await new Promise(function (r) { setTimeout(r, 10); });

    var frame = String(i).padStart(6, '0');
    await page.screenshot({
      path: path.join(FRAMES_DIR, 'frame_' + frame + '.png'),
      type: 'png',
    });

    // Progress every second of video
    if ((i + 1) % FPS === 0) {
      var sec = (i + 1) / FPS;
      console.log('  ' + sec + 's / ' + DURATION_SEC + 's');
    }
  }

  await browser.close();
  console.log('Browser closed. Encoding video with ffmpeg...');

  // Encode with ffmpeg — high quality h264
  var ffmpegArgs = [
    '-y',
    '-framerate', String(FPS),
    '-i', path.join(FRAMES_DIR, 'frame_%06d.png'),
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '15',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=' + WIDTH + ':' + HEIGHT + ':flags=lanczos',
    OUTPUT,
  ];

  console.log('Running: ffmpeg ' + ffmpegArgs.join(' ') + '\n');
  execFileSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });

  // Cleanup frames
  fs.rmSync(FRAMES_DIR, { recursive: true });

  console.log('\nDone! Video saved to: ' + OUTPUT);
}

main().catch(function (err) {
  console.error('Error:', err);
  process.exit(1);
});

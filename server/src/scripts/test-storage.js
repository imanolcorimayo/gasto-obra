/**
 * Test script for image compression + Firebase Storage upload.
 *
 * Usage:
 *   node src/scripts/test-storage.js <image_path> [audio_path]
 *
 * Examples:
 *   node src/scripts/test-storage.js ~/receipt.jpg
 *   node src/scripts/test-storage.js ~/receipt.jpg ~/note.ogg
 *
 * What it does:
 *   1. Compresses the image (sharp: rotate, resize 1200px, jpeg q80)
 *   2. Uploads compressed image to Firebase Storage
 *   3. Prints the permanent download URL (open in browser to verify)
 *   4. If audio path given, uploads audio as-is and prints its URL
 *   5. Optionally cleans up uploaded files (pass --cleanup)
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { bucket } from '../config/firebase.js';
import StorageHandler from '../handlers/StorageHandler.js';
import { compressImage } from '../helpers/compression.js';

const [imagePath, audioPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const cleanup = process.argv.includes('--cleanup');

if (!imagePath) {
  console.error('Usage: node src/scripts/test-storage.js <image_path> [audio_path] [--cleanup]');
  process.exit(1);
}

const storageHandler = new StorageHandler(bucket);
const uploadedPaths = [];

async function testImage(filePath) {
  console.log('\n--- Image Test ---');
  const raw = readFileSync(filePath);
  console.log(`Original: ${filePath} (${(raw.length / 1024).toFixed(1)} KB)`);

  const base64 = raw.toString('base64');
  const compressed = await compressImage(base64, 'image/jpeg');
  if (!compressed) {
    console.error('Compression failed!');
    return;
  }
  console.log(`Compressed: ${(compressed.buffer.length / 1024).toFixed(1)} KB, type: ${compressed.mimeType}`);

  const storagePath = storageHandler.generatePath('expenses', 'receipt.jpg');
  console.log(`Storage path: ${storagePath}`);

  const url = await storageHandler.uploadFile(compressed.buffer, storagePath, compressed.mimeType);
  if (!url) {
    console.error('Upload failed!');
    return;
  }
  uploadedPaths.push(storagePath);
  console.log(`Download URL: ${url}`);
}

async function testAudio(filePath) {
  console.log('\n--- Audio Test ---');
  const raw = readFileSync(filePath);
  console.log(`Original: ${filePath} (${(raw.length / 1024).toFixed(1)} KB)`);

  const ext = filePath.endsWith('.ogg') ? 'ogg' : basename(filePath).split('.').pop();
  const mimeType = ext === 'ogg' ? 'audio/ogg' : `audio/${ext}`;
  const storagePath = storageHandler.generatePath('expenses', `audio.${ext}`);
  console.log(`Storage path: ${storagePath}`);

  const url = await storageHandler.uploadFile(raw, storagePath, mimeType);
  if (!url) {
    console.error('Upload failed!');
    return;
  }
  uploadedPaths.push(storagePath);
  console.log(`Download URL: ${url}`);
}

async function cleanupFiles() {
  console.log('\n--- Cleanup ---');
  for (const path of uploadedPaths) {
    const ok = await storageHandler.deleteFile(path);
    console.log(`${path}: ${ok ? 'deleted' : 'FAILED'}`);
  }
}

try {
  await testImage(imagePath);
  if (audioPath) await testAudio(audioPath);
  if (cleanup) await cleanupFiles();
  console.log('\nDone.');
} catch (error) {
  console.error('Test failed:', error);
}
process.exit(0);

import { PDFParse } from 'pdf-parse';
import { readFileSync, writeFileSync } from 'fs';

// Create a minimal valid PDF for testing
const minimalPdf = `%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF`;

const testPdfPath = '/tmp/test-pdf-parse.pdf';
writeFileSync(testPdfPath, minimalPdf);

async function testFromFile() {
  console.log('=== Test: from file buffer ===');
  const buffer = readFileSync(testPdfPath);
  const parser = new PDFParse({ data: buffer });
  const doc = await parser.load();
  console.log('numPages:', doc.numPages);
  await parser.destroy();
  console.log('PASS: page count works\n');
}

async function testFromBase64() {
  console.log('=== Test: from base64 (like WhatsApp flow) ===');
  const buffer = readFileSync(testPdfPath);
  const base64 = buffer.toString('base64');

  // Simulate what the webhook does
  const pdfBuffer = Buffer.from(base64, 'base64');
  const parser = new PDFParse({ data: pdfBuffer });
  const doc = await parser.load();
  console.log('numPages:', doc.numPages);

  const MAX_PDF_PAGES = 5;
  if (doc.numPages > MAX_PDF_PAGES) {
    console.log(`REJECT: ${doc.numPages} pages > ${MAX_PDF_PAGES}`);
  } else {
    console.log(`ACCEPT: ${doc.numPages} pages <= ${MAX_PDF_PAGES}`);
  }
  await parser.destroy();
  console.log('PASS: base64 flow works\n');
}

try {
  await testFromFile();
  await testFromBase64();
  console.log('All tests passed!');
} catch (error) {
  console.error('FAIL:', error.message);
  process.exit(1);
}

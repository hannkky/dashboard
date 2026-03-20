// tmp/test-parser.mjs
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractWordText, extractPdfText, parseDocument } from '../src/services/parser.js';

// Polyfill File class for Node.js environment
class PolyfillFile {
  constructor(buffer, name) {
    this.buffer = buffer;
    this.name = name;
    this.type = this.getType(name);
  }

  getType(name) {
    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return 'application/octet-stream';
  }

  async arrayBuffer() {
    return this.buffer;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFile = async (filePath) => {
  console.log(`
--- Testing: ${path.basename(filePath)} ---
`);
  const absolutePath = path.resolve(__dirname, filePath);
  
  try {
    const fileBuffer = await fs.readFile(absolutePath);
    const file = new PolyfillFile(fileBuffer, path.basename(filePath));

    let fullText, page1Lines;

    if (file.type.includes('word')) {
      const extracted = await extractWordText(file);
      fullText = extracted;
      page1Lines = extracted.split('
').slice(0, 50); // Use first 50 lines for page1 context
      console.log('--- Extracted Word Text (first 500 chars) ---');
      console.log(fullText.substring(0, 500));
      console.log('---------------------------------------------
');
    } else if (file.type.includes('pdf')) {
      const { fullText: pdfText, page1Lines: pdfLines } = await extractPdfText(file);
      fullText = pdfText;
      page1Lines = pdfLines;
      console.log('--- Extracted PDF Text (first 500 chars) ---');
      console.log(fullText.substring(0, 500));
      console.log('--------------------------------------------
');
      console.log('--- Page 1 Lines (with separators) ---');
      console.log(page1Lines.join('
').substring(0, 1000));
      console.log('--------------------------------------
');
    } else {
      console.log('Unsupported file type.');
      return;
    }

    console.log('--- Parsing Document ---');
    const parsedData = parseDocument(fullText, page1Lines);
    console.log(JSON.stringify(parsedData, null, 2));
    console.log('------------------------
');

  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
};

(async () => {
  await testFile('F-PSE-17-LO-081 MARCO REGULATORIO DEL COMERCIO INTERNACIONAL.docx');
  await testFile('F-PSE-17-LO-101 LOGISTICA DE ABASTECIMIENTO.pdf');
})();

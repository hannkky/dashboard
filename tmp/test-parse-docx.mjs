import mammoth from 'mammoth';
import { parseDocument } from '../src/services/parser.js';

const docxPath = 'tmp/F-PSE-17-LO-081 MARCO REGULATORIO DEL COMERCIO INTERNACIONAL.docx';
const { value } = await mammoth.extractRawText({ path: docxPath });
const parsed = parseDocument(value, null);
console.log(JSON.stringify(parsed, null, 2));

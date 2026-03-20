import fs from 'fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseDocument } from '../src/services/parser.js';

const pdfPath = 'tmp/F-PSE-17-LO-101 LOGISTICA DE ABASTECIMIENTO.pdf';

const sanitizeText = (str) => {
  if (!str) return str;
  let s = str.normalize('NFC').replace(/\s+/g, ' ').trim();
  const fixes = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
    'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ',
    'Â°': '°', 'Âº': 'º', 'Âª': 'ª'
  };
  Object.entries(fixes).forEach(([bad, good]) => {
    s = s.split(bad).join(good);
  });
  s = s.replace(/[\u0000-\u001F\u007F]/g, '');
  s = s.replace(/[•–—]/g, '-');
  return s;
};

const normalizeTextForParsing = (str) => {
  if (!str) return '';
  let s = str.normalize('NFC');
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  s = s.replace(/[•–—]/g, '-');
  s = sanitizeText(s);
  s = s.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n');
  return s;
};

const buildLinesFromItems = (items, options = {}) => {
  const { withSeparators = false, pageWidth = 0 } = options;
  const midX = pageWidth ? pageWidth * 0.5 : 0;
  const normalized = items
    .filter(item => item.str && item.str.trim() !== '')
    .map(item => ({
      str: item.str,
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      hasEOL: item.hasEOL,
    }))
    .sort((a, b) => (b.y - a.y) || (a.x - b.x));

  const lines = [];
  let currentLine = [];
  let currentY = null;
  let prevX = null;
  const lineTolerance = 2;

  normalized.forEach((item) => {
    if (currentY === null) currentY = item.y;
    const sameLine = Math.abs(item.y - currentY) <= lineTolerance;

    if (!sameLine) {
      const lineText = currentLine.join(' ').trim();
      if (lineText) lines.push(lineText);
      currentLine = [];
      currentY = item.y;
      prevX = null;
    }

    if (withSeparators && midX && prevX !== null && prevX < midX && item.x >= midX) {
      currentLine.push('|');
    }

    currentLine.push(item.str);
    prevX = item.x;

    if (item.hasEOL) {
      const lineText = currentLine.join(' ').trim();
      if (lineText) lines.push(lineText);
      currentLine = [];
      currentY = null;
      prevX = null;
    }
  });

  const lastLine = currentLine.join(' ').trim();
  if (lastLine) lines.push(lastLine);

  return lines;
};

const data = new Uint8Array(await fs.readFile(pdfPath));
const pdf = await pdfjsLib.getDocument({ data }).promise;
let fullText = '';
let page1Lines = null;
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const textContent = await page.getTextContent();
  const lines = buildLinesFromItems(textContent.items);
  fullText += lines.join('\n') + '\n';
  if (i === 1) {
    const viewport = page.getViewport({ scale: 1 });
    page1Lines = buildLinesFromItems(textContent.items, { withSeparators: true, pageWidth: viewport.width });
  }
}

const clean = normalizeTextForParsing(fullText);
const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
const unitLines = lines.filter(l => /NOMBRE DE LA UNIDAD/i.test(l));
console.log(unitLines.slice(0, 5));

const parsed = parseDocument(fullText, page1Lines);
console.log(JSON.stringify(parsed, null, 2));

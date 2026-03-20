import fs from 'fs/promises';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfPath = 'tmp/F-PSE-17-LO-101 LOGISTICA DE ABASTECIMIENTO.pdf';
const docxPath = 'tmp/F-PSE-17-LO-081 MARCO REGULATORIO DEL COMERCIO INTERNACIONAL.docx';

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

const inspectPdf = async () => {
  const data = new Uint8Array(await fs.readFile(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const lines = buildLinesFromItems(textContent.items);
  const linesWithSep = buildLinesFromItems(textContent.items, { withSeparators: true, pageWidth: viewport.width });
  console.log('PDF page 1 lines (first 120):');
  lines.slice(0, 120).forEach((l, i) => console.log(String(i + 1).padStart(2, '0'), l));
  console.log('\nPDF page 1 lines with separators (first 120):');
  linesWithSep.slice(0, 120).forEach((l, i) => console.log(String(i + 1).padStart(2, '0'), l));
};

const inspectDocx = async () => {
  const { value } = await mammoth.extractRawText({ path: docxPath });
  const lines = value.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('\nDOCX lines (first 200):');
  lines.slice(0, 200).forEach((l, i) => console.log(String(i + 1).padStart(2, '0'), l));
};

await inspectPdf();
await inspectDocx();

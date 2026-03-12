import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const sanitizeText = (str) => {
  if (!str) return str;
  let s = str.normalize('NFC').replace(/\s+/g, ' ').trim();
  const fixes = {
    'á': 'á', 'é': 'é', 'í': 'í', 'ó': 'ó', 'ú': 'ú', 'ñ': 'ñ',
    'Á': 'Á', 'É': 'É', 'Í': 'Í', 'Ó': 'Ó', 'Ú': 'Ú', 'Ñ': 'Ñ',
    '°': '°', 'º': 'º', 'ª': 'ª'
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
  s = s.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n');
  return s;
};

const findFirstMatch = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
};

const extractField = (text, patterns, defaultValue, maxLen = 100) => {
  const match = findFirstMatch(text, patterns);
  if (match) {
    if (match[1]) return sanitizeText(match[1].trim()).substring(0, maxLen);
    const index = match.index + match[0].length;
    const nextText = text.substring(index, index + 150);
    const extracted = nextText.match(/[^\n\r,;:]*/);
    if (extracted) {
      const cleaned = sanitizeText(extracted[0].trim());
      return cleaned || defaultValue;
    }
  }
  return defaultValue;
};

const labelKeywords = [
  'PROGRAMA EDUCATIVO', 'NOMBRE DE LA ASIGNATURA', 'NOMBRE DE LA MATERIA',
  'DOCENTE(S)', 'DOCENTE', 'PROFESOR', 'CUATRIMESTRE', 'GRUPO', 'HORAS TOTALES',
  'TOTAL DE HORAS', 'FECHA DE INICIO', 'FECHA DE FIN', 'PERIODO', 'PERIODO ESCOLAR'
];

const isLabelLine = (line) => {
  const upper = line.toUpperCase();
  if (labelKeywords.some(k => upper.startsWith(k))) return true;
  return /^[A-ZÁÉÍÓÚÑ0-9().\-\s]{3,}:\s*$/.test(upper);
};

const isInstructionText = (value) => {
  if (!value) return false;
  return /(SE DEBE|ESCRIBIR|INDICAR|DETALLAR)/i.test(value.trim());
};

const cleanLabelValue = (value) => {
  if (!value) return value;
  let cleaned = sanitizeText(value);
  cleaned = cleaned.replace(/^ESPECIALIDAD\s*[:\-]\s*/i, '').trim();
  cleaned = cleaned.replace(/\b(CUATRIMESTRE|GRUPO|DOCENTE|ASIGNATURA|MATERIA|PERIODO|FECHA|HORAS)\b.*$/i, '').trim();
  cleaned = cleaned.replace(/\b(SE DEBE|ESCRIBIR|INDICAR|DETALLAR)\b[\s\S]*$/i, '').trim();
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
};

const getValueFromLabelBlock = (text, labelRegex) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(labelRegex);
    if (match) {
      let value = (match[1] || '').trim();
      if (!value) {
        const parts = [];
        for (let j = i + 1; j < lines.length; j++) {
          const next = lines[j].trim();
          if (!next) continue;
          if (isInstructionText(next)) continue;
          if (isLabelLine(next)) break;
          parts.push(next);
          if (parts.join(' ').length >= 120) break;
        }
        value = parts.join(' ').trim();
      }
      return sanitizeText(value);
    }
  }
  return '';
};

const extractCuatrimestre = (text) => {
  const match = findFirstMatch(text, [
    /CUATRIMESTRE\s*[:\(\-]\s*(\d+|PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SÉPTIMO|OCTAVO|NOVENO|DÉCIMO)/i,
    /GRADO\s*[:\-\s]+(\d+)/i
  ]);
  if (match) {
    const value = match[1].toUpperCase();
    const mapping = {
      'PRIMERO': '1', 'SEGUNDO': '2', 'TERCERO': '3', 'CUARTO': '4', 'QUINTO': '5',
      'SEXTO': '6', 'SÉPTIMO': '7', 'OCTAVO': '8', 'NOVENO': '9', 'DÉCIMO': '10'
    };
    return mapping[value] || value;
  }
  return '1';
};

const extractCarrera = (text) => {
  const byLabel = getValueFromLabelBlock(text, /PROGRAMA EDUCATIVO\s*[:\-]\s*(.*)$/i);
  const cleaned = cleanLabelValue(byLabel);
  if (cleaned) return cleaned.substring(0, 80);

  const match = findFirstMatch(text, [
    /PROGRAMA EDUCATIVO\s*[:\-]\s*([^\n]+)/i,
    /CARRERA\s*[:\-]\s*([^\n]+)/i,
    /LICENCIATURA EN\s*([^\n]+)/i,
    /INGENIERÍA EN\s*([^\n]+)/i
  ]);
  if (match) {
    let carrera = sanitizeText(match[1].trim());
    carrera = carrera.split(/[-,]/)[0].trim();
    if (/^LICENCIATURA|^INGENIERÍA/i.test(carrera)) {
      return carrera.substring(0, 80) || 'Licenciatura';
    }
    return carrera.substring(0, 80) || 'Licenciatura';
  }
  return 'Licenciatura';
};

const extractEspecialidad = (text) => {
  const byLabel = getValueFromLabelBlock(text, /ESPECIALIDAD\s*[:\-]\s*(.*)$/i);
  const cleaned = cleanLabelValue(byLabel);
  if (cleaned && !isInstructionText(cleaned)) return cleaned.substring(0, 80);
  return '';
};

const extractPeriodoEscolar = (text) => {
  const byLabel = getValueFromLabelBlock(text, /PERIODO ESCOLAR\s*[:\-]\s*(.*)$/i);
  if (byLabel) {
    const cleaned = cleanLabelValue(byLabel).substring(0, 40);
    if (!isInstructionText(cleaned)) return cleaned;
  }
  return '';
};

const extractGrupo = (text) => {
  const match = findFirstMatch(text, [
    /GRUPO\s*[:\-\s]+([A-Z]-?\d+)/i,
    /GRUPO\s*:\s*([A-Z]\s?\d+)/i
  ]);
  if (match) return match[1].replace(/\s+/g, '').trim();
  return 'A1';
};

const extractDocente = (text) => {
  const byLabel = getValueFromLabelBlock(text, /DOCENTE\s*[:\-]\s*(.*)$/i);
  const cleaned = cleanLabelValue(byLabel);
  if (cleaned && !isInstructionText(cleaned)) return cleaned.substring(0, 60);

  const match = findFirstMatch(text, [
    /DOCENTE\s*[:\-]\s*([^\n]+)/i,
    /PROFESOR\s*[:\-]\s*([^\n]+)/i
  ]);
  if (match) {
    let docente = sanitizeText(match[1].trim());
    docente = docente.split(/[,;•]/)[0].trim();
    if (isInstructionText(docente)) return 'Docente';
    return docente.substring(0, 60) || 'Docente';
  }
  return 'Docente';
};

const formatUnitTitle = (rawTitle, index) => {
  if (!rawTitle) return `UNIDAD ${index}:`;
  let title = sanitizeText(rawTitle).trim();
  title = title.replace(/^UNIDAD\s*:\s*/i, '').trim();
  title = title.replace(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.?\s*[-–]?\s*/i, '').trim();
  return `UNIDAD ${index}: ${title || 'SIN TÍTULO'}`;
};

const extractUnits = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const units = [];
  const unitHeaderIdx = [];

  lines.forEach((line, idx) => {
    if (/^NOMBRE DE LA UNIDAD/i.test(line)) {
      unitHeaderIdx.push(idx);
    }
  });

  if (unitHeaderIdx.length === 0) return units;

  for (let u = 0; u < unitHeaderIdx.length; u++) {
    const start = unitHeaderIdx[u];
    const end = unitHeaderIdx[u + 1] ?? lines.length;
    const block = lines.slice(start, end);
    const nameLine = block.find((line, i) => i > 0 && line && !isInstructionText(line)) || '';
    const title = formatUnitTitle(nameLine, u + 1);

    units.push({
      titulo: title,
      fechaPlaneada: '',
      fechaReal: '',
      fechaEvalPlaneada: '',
      fechaEvalReal: ''
    });
  }
  return units;
};

const extractMateria = (text) => {
  const byLabel = getValueFromLabelBlock(text, /NOMBRE DE LA ASIGNATURA\s*[:\-]\s*(.*)$/i);
  const cleaned = cleanLabelValue(byLabel);
  if (cleaned) return cleaned.substring(0, 100);
  return extractField(text, [
    /NOMBRE DE LA ASIGNATURA\s*[:\-\s]+([^\n]+)/i,
    /ASIGNATURA\s*[:\-\s]+([^\n]+)/i,
    /MATERIA\s*[:\-\s]+([^\n]+)/i
  ], 'Materia');
};

const parseDateString = (raw) => {
  if (!raw) return null;
  const meses = {
    enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
    julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
  };
  const numeric = raw.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (numeric) {
    const day = numeric[1].padStart(2, '0');
    const month = numeric[2].padStart(2, '0');
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    return `${year}-${month}-${day}`;
  }
  return null;
};

const extractDates = (text) => {
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const defaultYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

  const inicioMatch = findFirstMatch(text, [
    /FECHA DE INICIO\s*[:\-\s]+([^\n]+)/i,
    /INICIO\s*[:\-\s]+([^\n]+)/i
  ]);
  const finMatch = findFirstMatch(text, [
    /FECHA DE FIN\s*[:\-\s]+([^\n]+)/i,
    /FIN\s*[:\-\s]+([^\n]+)/i
  ]);

  const fechaInicio = parseDateString(inicioMatch?.[1]) || parseDateString(inicioMatch?.[0]);
  const fechaFin = parseDateString(finMatch?.[1]) || parseDateString(finMatch?.[0]);

  if (fechaInicio && fechaFin) return { fechaInicio, fechaFin };

  return { fechaInicio: `${defaultYear}-01-01`, fechaFin: `${defaultYear}-12-31` };
};

export const extractWordText = async (wordFile) => {
  try {
    const arrayBuffer = await wordFile.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting Word:', error);
    throw error;
  }
};

export const buildLinesFromItems = (items, options = {}) => {
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

export const extractPdfText = async (pdfFile) => {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

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
    return { fullText, page1Lines };
  } catch (error) {
    console.error('Error extracting PDF:', error);
    throw error;
  }
};

export const parseDocument = (fullText, page1Lines) => {
  const cleanText = normalizeTextForParsing(fullText);
  const dates = extractDates(cleanText);
  const unidades = extractUnits(cleanText);

  const data = {
    carrera: extractCarrera(cleanText),
    especialidad: extractEspecialidad(cleanText),
    grado: extractCuatrimestre(cleanText),
    grupo: extractGrupo(cleanText),
    nombMateria: extractMateria(cleanText),
    fechaInicio: dates.fechaInicio,
    fechaFin: dates.fechaFin,
    cuatrimestre: extractPeriodoEscolar(cleanText),
    periodoEscolar: extractPeriodoEscolar(cleanText),
    docente: extractDocente(cleanText),
    horasTotales: extractField(cleanText, [
      /HORAS TOTALES\s*[:\-\s]+(\d+)/i,
      /TOTAL DE HORAS\s*[:\-\s]+(\d+)/i
    ], '75'),
    turno: '',
    fechaElaboracion: new Date().toISOString().slice(0, 10),
    unidades: unidades.length > 0 ? unidades : [{
      titulo: '',
      fechaPlaneada: '',
      fechaReal: '',
      fechaEvalPlaneada: '',
      fechaEvalReal: ''
    }],
  };
  return data;
};


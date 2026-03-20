import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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

const sanitizeTextPreserveNewlines = (str) => {
  if (!str) return str;
  let s = str.normalize('NFC');
  const fixes = {
    'ÃƒÂ¡': 'Ã¡', 'ÃƒÂ©': 'Ã©', 'ÃƒÂ­': 'Ã­', 'ÃƒÂ³': 'Ã³', 'ÃƒÂº': 'Ãº', 'ÃƒÂ±': 'Ã±',
    'ÃƒÂ': 'Ã', 'Ãƒâ€°': 'Ã‰', 'ÃƒÂ': 'Ã', 'Ãƒâ€œ': 'Ã“', 'ÃƒÅ¡': 'Ãš', 'Ãƒâ€˜': 'Ã‘',
    'Ã‚Â°': 'Â°', 'Ã‚Âº': 'Âº', 'Ã‚Âª': 'Âª'
  };
  Object.entries(fixes).forEach(([bad, good]) => {
    s = s.split(bad).join(good);
  });
  s = s.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '');
  s = s.replace(/[â€¢â€“â€”]/g, '-');
  return s;
};

const normalizeTextForParsing = (str) => {
  if (!str) return '';
  let s = str.normalize('NFC');
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  s = s.replace(/[•–—]/g, '-');
  s = sanitizeTextPreserveNewlines(s);
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

const normalizeKey = (value) => (value || '')
  .toUpperCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const getValueFromPageLines = (pageLines, labels) => {
  if (!pageLines || pageLines.length === 0) return '';
  const labelKeys = labels.map(normalizeKey);
  const splitColumns = (line) => {
    if (!line) return [''];
    if (!line.includes('|')) return [line.trim()];
    return line.split('|').map(part => part.trim());
  };
  const findNextValueLine = (startIndex) => {
    for (let j = startIndex; j < Math.min(startIndex + 4, pageLines.length); j++) {
      const candidate = sanitizeText(pageLines[j] || '');
      if (!candidate) continue;
      if (isInstructionText(candidate)) continue;
      return candidate;
    }
    return '';
  };

  for (let i = 0; i < pageLines.length; i++) {
    const raw = sanitizeText(pageLines[i]);
    const cols = splitColumns(raw);
    for (const label of labelKeys) {
      for (let idx = 0; idx < cols.length; idx++) {
        const colText = cols[idx];
        const colNorm = normalizeKey(colText);
        if (!colNorm.includes(label)) continue;

        const direct = colText.match(new RegExp(`${label}\\s*[:\\-]\\s*(.+)$`, 'i'));
        if (direct && direct[1]) {
          const value = direct[1].trim();
          if (value && !isInstructionText(value)) return value;
        }

        const fallback = colText.replace(new RegExp(`.*${label}\\s*[:\\-]?\\s*`, 'i'), '').trim();
        if (fallback && fallback !== colText.trim() && !isInstructionText(fallback)) return fallback;

        const nextLine = findNextValueLine(i + 1);
        if (nextLine) {
          const nextCols = splitColumns(nextLine);
          const candidate = (nextCols[idx] || '').trim();
          if (candidate && !isInstructionText(candidate)) return candidate;
        }
      }
    }
  }
  return '';
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
      PRIMERO: '1', SEGUNDO: '2', TERCERO: '3', CUARTO: '4', QUINTO: '5',
      SEXTO: '6', SÉPTIMO: '7', OCTAVO: '8', NOVENO: '9', DÉCIMO: '10'
    };
    return mapping[value] || value;
  }
  return '1';
};

const extractCarrera = (text, page1Lines) => {
  const fromPage = cleanLabelValue(getValueFromPageLines(page1Lines, ['PROGRAMA EDUCATIVO', 'CARRERA']));
  if (fromPage) {
    if (page1Lines && page1Lines.length) {
      const prefixLine = page1Lines.find(line => /LICENCIATURA EN|INGENIER[IÍ]A EN|TSU EN/i.test(line));
      if (prefixLine && prefixLine.includes('|')) {
        const left = prefixLine.split('|')[0]?.trim();
        if (left && left.length > 10) {
          return `${left} ${fromPage}`.replace(/\s+/g, ' ').substring(0, 80);
        }
      }
    }
    return fromPage.substring(0, 80);
  }
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

const extractEspecialidad = (text, page1Lines) => {
  const fromPage = cleanLabelValue(getValueFromPageLines(page1Lines, ['ESPECIALIDAD']));
  if (fromPage && !isInstructionText(fromPage)) return fromPage.substring(0, 80);
  const byLabel = getValueFromLabelBlock(text, /ESPECIALIDAD\s*[:\-]\s*(.*)$/i);
  const cleaned = cleanLabelValue(byLabel);
  if (cleaned && !isInstructionText(cleaned)) return cleaned.substring(0, 80);
  return '';
};

const extractPeriodoEscolar = (text, page1Lines) => {
  const fromPage = cleanLabelValue(getValueFromPageLines(page1Lines, ['CUATRIMESTRE', 'PERIODO']));
  if (fromPage && !isInstructionText(fromPage) && !/^(PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|S[EÉ]PTIMO|OCTAVO|NOVENO|D[EÉ]CIMO|\d+)$/i.test(fromPage)) {
    return fromPage.substring(0, 40);
  }
  const headerRange = text.match(/CUATRIMESTRE[^\n]{0,120}((?:ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*[-–]\s*(?:ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*\d{4})/i);
  if (headerRange && headerRange[1]) return sanitizeText(headerRange[1]);
  const periodoRange = text.match(/PERIODO ESCOLAR[^\n]{0,120}((?:ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*[-–]\s*(?:ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*\d{4})/i);
  if (periodoRange && periodoRange[1]) return sanitizeText(periodoRange[1]);
  const byLabel = getValueFromLabelBlock(text, /PERIODO ESCOLAR\s*[:\-]\s*(.*)$/i);
  if (byLabel) {
    const cleaned = cleanLabelValue(byLabel).substring(0, 40);
    if (!isInstructionText(cleaned)) return cleaned;
  }
  if (page1Lines && page1Lines.length) {
    for (const line of page1Lines) {
      const cleanedLine = sanitizeText(line);
      const match = cleanedLine.match(/\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\b\s*[-–]\s*\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\b\s*\d{4}/i);
      if (match) return sanitizeText(match[0]);
    }
  }
  const range = text.match(/\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\b\s*[-–]\s*\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\b\s*\d{4}/i);
  if (range) return sanitizeText(range[0]);
  return '';
};

const extractGrupo = (text, page1Lines) => {
  if (page1Lines && page1Lines.length) {
    for (const line of page1Lines) {
      const raw = sanitizeText(line);
      if (!/GRUPO\s*\(S\)|GRUPO/i.test(raw)) continue;
      const direct = raw.match(/GRUPO\s*\(S\)\s*[:\-]\s*([^|]+)/i) || raw.match(/GRUPO\s*[:\-]\s*([^|]+)/i);
      if (direct && direct[1]) {
        const cleaned = direct[1].trim();
        const normalized = cleaned.replace(/[^A-Z0-9]/gi, '');
        const looksLikeMateria = raw.includes('NOMBRE DE LA ASIGNATURA') && !/\d/.test(normalized) && cleaned.split(' ').length > 1;
        if (cleaned && !isInstructionText(cleaned) && !looksLikeMateria) {
          const group = cleaned.split(',')[0].replace(/[^A-Z0-9]/gi, '').trim();
          if (group) return group;
        }
      }
      if (raw.includes('|')) {
        const parts = raw.split('|').map(p => p.trim()).filter(Boolean);
        const last = parts[parts.length - 1];
        if (last && !isInstructionText(last)) {
          const group = last.split(',')[0].replace(/[^A-Z0-9]/gi, '').trim();
          if (group) return group;
        }
      }
    }
  }
  const match = findFirstMatch(text, [
    /GRUPO\s*[:\-\s]+([A-Z]-?\d+)/i,
    /GRUPO\s*:\s*([A-Z]\s?\d+)/i
  ]);
  if (match) return match[1].replace(/\s+/g, '').replace(/[^A-Z0-9]/gi, '').trim();
  const fallback = text.match(/GRUPO\s*\(S\)\s*[:\-]\s*([A-Z0-9,\s]+)/i);
  if (fallback && fallback[1]) {
    const group = fallback[1].split(',')[0].replace(/[^A-Z0-9]/gi, '').trim();
    if (group) return group;
  }
  return 'A1';
};

const extractDocente = (text, page1Lines) => {
  const fromPage = cleanLabelValue(getValueFromPageLines(page1Lines, ['DOCENTE(S)', 'DOCENTE (S)', 'DOCENTE', 'PROFESOR']));
  if (fromPage && !isInstructionText(fromPage) && !/DOCENTE|\(S\)|:/.test(fromPage)) return fromPage.substring(0, 60);
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
  title = title.replace(/^[^A-ZÁÉÍÓÚÑa-z0-9]+/, '').trim();
  title = title.replace(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)[^A-ZÁÉÍÓÚÑa-z0-9]+/i, '').trim();
  title = title.replace(/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\s*\.?\s*/i, '').trim();
  return `UNIDAD ${index}: ${title || 'SIN TITULO'}`;
};

const monthMap = {
  ENERO: '01',
  FEBRERO: '02',
  MARZO: '03',
  ABRIL: '04',
  MAYO: '05',
  JUNIO: '06',
  JULIO: '07',
  AGOSTO: '08',
  SEPTIEMBRE: '09',
  SETIEMBRE: '09',
  OCTUBRE: '10',
  NOVIEMBRE: '11',
  DICIEMBRE: '12'
};

const findYearInText = (text) => {
  const match = text.match(/\b(20\d{2})\b/);
  return match ? match[1] : new Date().getFullYear().toString();
};

const parseSpanishRange = (line, fallbackYear) => {
  const match = line.match(/(?:DEL\s*)?(\d{1,2})\s*AL\s*(\d{1,2})\s*DE\s*([A-ZÁÉÍÓÚÑ]+)(?:\s*DE\s*(\d{4}))?/i);
  if (!match) return null;
  const monthKey = match[3].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const month = monthMap[monthKey];
  if (!month) return null;
  const year = match[4] || fallbackYear;
  const start = `${String(match[1]).padStart(2, '0')}/${month}/${year}`;
  const end = `${String(match[2]).padStart(2, '0')}/${month}/${year}`;
  return { start, end };
};

const parseSpanishSingleDate = (line, fallbackYear) => {
  const match = line.match(/(\d{1,2})\s*DE\s*([A-ZÁÉÍÓÚÑ]+)(?:\s*DE\s*(\d{4}))?/i);
  if (!match) return null;
  const monthKey = match[2].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const month = monthMap[monthKey];
  if (!month) return null;
  const year = match[3] || fallbackYear;
  return `${String(match[1]).padStart(2, '0')}/${month}/${year}`;
};

const collectDateRanges = (line, fallbackYear) => {
  const ranges = [];
  const numericRange = /(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:-|al|a)\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi;
  let match = null;
  while ((match = numericRange.exec(line)) !== null) {
    ranges.push({ start: match[1], end: match[2] });
  }
  const spanishRange = /(?:DEL\s*)?(\d{1,2})\s*AL\s*(\d{1,2})\s*DE\s*([A-ZÁÉÍÓÚÑ]+)(?:\s*DE\s*(\d{4}))?/gi;
  while ((match = spanishRange.exec(line)) !== null) {
    const monthKey = match[3].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const month = monthMap[monthKey];
    if (!month) continue;
    const year = match[4] || fallbackYear;
    ranges.push({
      start: `${String(match[1]).padStart(2, '0')}/${month}/${year}`,
      end: `${String(match[2]).padStart(2, '0')}/${month}/${year}`
    });
  }
  return ranges;
};

const collectSingleDates = (line, fallbackYear) => {
  const dates = [];
  const numeric = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g;
  let match = null;
  while ((match = numeric.exec(line)) !== null) {
    dates.push(match[1]);
  }
  const spanish = parseSpanishSingleDate(line, fallbackYear);
  if (spanish) dates.push(spanish);
  return dates;
};

const extractUnits = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const units = [];
  const unitHeaderIdx = [];
  const defaultYear = findYearInText(text);

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
    const headerLine = block[0] || '';
    let nameLine = '';
    const inlineTitle = headerLine.match(/NOMBRE DE LA UNIDAD DE APRENDIZAJE\s*[:\-]\s*(.+)$/i);
    if (inlineTitle && inlineTitle[1]) {
      nameLine = inlineTitle[1];
    } else {
      nameLine = block.find((line, i) => i > 0 && line && !isInstructionText(line)) || '';
    }
    const title = formatUnitTitle(nameLine, u + 1);

    const dateRanges = [];
    const realRanges = [];
    const evalPlannedDates = [];
    const evalRealDates = [];
    let dateMode = 'planeada';
    for (let i = 0; i < block.length; i++) {
      const line = block[i];
      if (/FECHA\s+REAL/i.test(line)) dateMode = 'real';
      if (/FECHA\s+PROGRAMADA/i.test(line)) dateMode = 'planeada';
      const ranges = collectDateRanges(line, defaultYear);
      if (ranges.length >= 2) {
        dateRanges.push(ranges[0]);
        realRanges.push(ranges[1]);
      } else if (ranges.length === 1) {
        if (dateMode === 'real' || /REAL/i.test(line)) {
          realRanges.push(ranges[0]);
        } else {
          dateRanges.push(ranges[0]);
        }
      }

      if (/EVALUACI[ÓO]N|EXAMEN/i.test(line)) {
        const evalRanges = collectDateRanges(line, defaultYear);
        const evalSingles = collectSingleDates(line, defaultYear);
        if (evalRanges.length >= 2) {
          evalPlannedDates.push(evalRanges[0].end);
          evalRealDates.push(evalRanges[1].end);
        } else if (evalRanges.length === 1) {
          if (dateMode === 'real' || /REAL/i.test(line)) {
            evalRealDates.push(evalRanges[0].end);
          } else {
            evalPlannedDates.push(evalRanges[0].end);
          }
        } else if (evalSingles.length >= 2) {
          evalPlannedDates.push(evalSingles[0]);
          evalRealDates.push(evalSingles[1]);
        } else if (evalSingles.length === 1) {
          if (dateMode === 'real' || /REAL/i.test(line)) {
            evalRealDates.push(evalSingles[0]);
          } else {
            evalPlannedDates.push(evalSingles[0]);
          }
        } else if (dateMode === 'real' && realRanges.length > 0) {
          evalRealDates.push(realRanges[realRanges.length - 1].end);
        } else if (dateMode !== 'real' && dateRanges.length > 0) {
          evalPlannedDates.push(dateRanges[dateRanges.length - 1].end);
        } else if (block[i - 1]) {
          const prevSpan = parseSpanishRange(block[i - 1], defaultYear);
          if (prevSpan) {
            if (dateMode === 'real') {
              evalRealDates.push(prevSpan.end);
            } else {
              evalPlannedDates.push(prevSpan.end);
            }
          }
        }
      }
    }

    const startRange = dateRanges[0];
    const endRange = dateRanges[dateRanges.length - 1];
    const fechaPlaneada = startRange && endRange ? `${startRange.start} al ${endRange.end}` : '';
    const startReal = realRanges[0];
    const endReal = realRanges[realRanges.length - 1];
    const fechaReal = startReal && endReal ? `${startReal.start} al ${endReal.end}` : '';

    units.push({
      titulo: title,
      fechaPlaneada,
      fechaReal,
      fechaEvalPlaneada: evalPlannedDates[0] || '',
      fechaEvalReal: evalRealDates[0] || ''
    });
  }
  return units;
};

const extractMateria = (text, page1Lines) => {
  const fromPage = cleanLabelValue(getValueFromPageLines(page1Lines, ['NOMBRE DE LA ASIGNATURA', 'MATERIA']));
  if (fromPage && !/GRUPO|DOCENTE|PROGRAMA|CUATRIMESTRE|PROP[ÓO]SITO|COMPETENCIA/i.test(fromPage)) {
    return fromPage.substring(0, 100);
  }
  if (page1Lines && page1Lines.length) {
    const matchLine = page1Lines.find(line => /NOMBRE DE LA ASIGNATURA/i.test(line));
    if (matchLine && /GRUPO\s*\(S\)/i.test(matchLine)) {
      const found = matchLine.match(/GRUPO\s*\(S\)\s*[:\-]\s*([^|]+)/i);
      if (found && found[1]) return cleanLabelValue(found[1]).substring(0, 100);
    }
  }
  const between = text.match(/NOMBRE DE LA ASIGNATURA\s*[:\-]\s*(.+?)\s+GRUPO/i);
  if (between && between[1]) {
    const candidate = cleanLabelValue(between[1]);
    if (candidate && !/PROP[ÓO]SITO|COMPETENCIA|PROGRAMA|DOCENTE|CUATRIMESTRE/i.test(candidate)) {
      return candidate.substring(0, 100);
    }
  }
  const byLabel = getValueFromLabelBlock(text, /NOMBRE DE LA ASIGNATURA\s*[:\-]\s*(.*)$/i);
  const cleaned = cleanLabelValue(byLabel);
  if (cleaned && !/PROP[ÓO]SITO|COMPETENCIA|PROGRAMA|DOCENTE|CUATRIMESTRE|GRUPO/i.test(cleaned)) {
    return cleaned.substring(0, 100);
  }
  const fallback = extractField(text, [
    /NOMBRE DE LA ASIGNATURA\s*[:\-\s]+([^\n]+)/i,
    /ASIGNATURA\s*[:\-\s]+([^\n]+)/i,
    /MATERIA\s*[:\-\s]+([^\n]+)/i
  ], 'Materia');
  if (/PROP[ÓO]SITO|COMPETENCIA|PROGRAMA|DOCENTE|CUATRIMESTRE|GRUPO/i.test(fallback)) return 'Materia';
  return fallback;
};

const parseDateString = (raw) => {
  if (!raw) return null;
  const numeric = raw.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (numeric) {
    const day = numeric[1].padStart(2, '0');
    const month = numeric[2].padStart(2, '0');
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    return `${year}-${month}-${day}`;
  }
  return null;
};

const extractFechaElaboracion = (text, page1Lines) => {
  const fromPage = getValueFromPageLines(page1Lines, ['FECHA DE ELABORACION', 'FECHA ELABORACION']);
  const direct = parseDateString(fromPage) || parseDateString(text.match(/FECHA DE ELABORACION\s*[:\-\s]+([^\n]+)/i)?.[1]);
  if (direct) return direct;
  return new Date().toISOString().slice(0, 10);
};

const extractTurno = (text, page1Lines) => {
  const fromPage = getValueFromPageLines(page1Lines, ['TURNO']);
  const raw = fromPage || extractField(text, [/TURNO\s*[:\-\s]+([^\n]+)/i], '');
  return sanitizeText(raw).substring(0, 20);
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
    let htmlText = '';
    try {
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      htmlText = htmlResult?.value || '';
    } catch (e) {}

    const tableText = [];
    if (htmlText) {
      const rows = htmlText.split(/<\/tr>/i);
      rows.forEach((row) => {
        const cells = row.split(/<\/t[dh]>/i)
          .map((cell) => cell.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (cells.length > 0) {
          tableText.push(cells.join(' | '));
        }
      });
    }

    return [result.value, tableText.join('\n')].filter(Boolean).join('\n');
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
    carrera: extractCarrera(cleanText, page1Lines),
    especialidad: extractEspecialidad(cleanText, page1Lines),
    grado: extractCuatrimestre(cleanText),
    grupo: extractGrupo(cleanText, page1Lines),
    nombMateria: extractMateria(cleanText, page1Lines),
    fechaInicio: dates.fechaInicio,
    fechaFin: dates.fechaFin,
    cuatrimestre: extractPeriodoEscolar(cleanText, page1Lines),
    periodoEscolar: extractPeriodoEscolar(cleanText, page1Lines),
    docente: extractDocente(cleanText, page1Lines),
    horasTotales: extractField(cleanText, [
      /HORAS TOTALES\s*[:\-\s]+(\d+)/i,
      /TOTAL DE HORAS\s*[:\-\s]+(\d+)/i
    ], '75'),
    turno: extractTurno(cleanText, page1Lines),
    fechaElaboracion: extractFechaElaboracion(cleanText, page1Lines),
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

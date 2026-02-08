import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { useEffect, useState } from 'react';
import { t } from '../../i18n';
import Popup from '../ui/Popup';

// Configurar worker del PDF.js usando archivo de public
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

function NuevaPlaneacionModal({ isOpen, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [specialtiesByCareer, setSpecialtiesByCareer] = useState({});
  const [newSpecialty, setNewSpecialty] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    const isPdf = selectedFile?.type === 'application/pdf' || selectedFile?.name?.toLowerCase().endsWith('.pdf');
    const isDocx = selectedFile?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || selectedFile?.name?.toLowerCase().endsWith('.docx');
    if (selectedFile && (isPdf || isDocx)) {
      setFile(selectedFile);
      setExtractedData(null);
      setShowPreview(false);
    } else {
      alert('Por favor selecciona un archivo PDF o Word válido');
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('especialidadesPorCarrera');
      if (raw) setSpecialtiesByCareer(JSON.parse(raw));
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('especialidadesPorCarrera', JSON.stringify(specialtiesByCareer)); } catch (e) {}
  }, [specialtiesByCareer]);

  const careerKey = (value) => (value || '').trim().toLowerCase();

  const getSpecialtiesForCareer = (careerName) => {
    const key = careerKey(careerName);
    return specialtiesByCareer[key] || [];
  };

  const addSpecialtyForCareer = () => {
    const careerName = editedData?.carrera || '';
    const key = careerKey(careerName);
    const nextValue = newSpecialty.trim();
    if (!key || !nextValue) return;
    const current = specialtiesByCareer[key] || [];
    if (current.some(s => s.toLowerCase() === nextValue.toLowerCase())) return;
    const updated = { ...specialtiesByCareer, [key]: [...current, nextValue] };
    setSpecialtiesByCareer(updated);
    setEditedData({ ...editedData, especialidad: nextValue });
    setNewSpecialty('');
  };

  const removeSpecialtyForCareer = (value) => {
    const careerName = editedData?.carrera || '';
    const key = careerKey(careerName);
    if (!key) return;
    const current = specialtiesByCareer[key] || [];
    const next = current.filter(s => s !== value);
    const updated = { ...specialtiesByCareer, [key]: next };
    setSpecialtiesByCareer(updated);
    if (editedData?.especialidad === value) {
      setEditedData({ ...editedData, especialidad: next[0] || '' });
    }
  };

  useEffect(() => {
    if (!editedData) return;
    const list = getSpecialtiesForCareer(editedData.carrera);
    if (editedData.especialidad && !list.includes(editedData.especialidad)) {
      // keep user input if it isn't in list yet
      return;
    }
    if (!editedData.especialidad && list.length > 0) {
      setEditedData({ ...editedData, especialidad: list[0] });
    }
  }, [editedData?.carrera, specialtiesByCareer]);

  const extractWordText = async (wordFile) => {
    try {
      const arrayBuffer = await wordFile.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error extracting Word:', error);
      throw error;
    }
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

  const extractPdfText = async (pdfFile) => {
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
    const fixes = {
      'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
      'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ',
      'Â°': '°', 'Âº': 'º', 'Âª': 'ª'
    };
    let s = str.normalize('NFC').replace(/\r\n?/g, '\n');
    Object.entries(fixes).forEach(([bad, good]) => {
      s = s.split(bad).join(good);
    });
    s = s.replace(/[\u0000-\u001F\u007F]/g, (m) => (m === '\n' ? '\n' : ''));
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
    'TOTAL DE HORAS', 'FECHA DE INICIO', 'FECHA DE FIN', 'PERIODO', 'PERIODO ESCOLAR', 'ASIGNATURA', 'MATERIA',
    'ESPECIALIDAD'
  ];

  const isLabelLine = (line) => {
    const upper = line.toUpperCase();
    if (labelKeywords.some(k => upper.startsWith(k))) return true;
    return /^[A-ZÁÉÍÓÚÑ0-9().\-\s]{3,}:\s*$/.test(upper);
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

  const getValueFromSeparatedLines = (lines, labelRegex, colIndex, maxLines = 3) => {
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('|').map(p => p.trim());
      const segment = parts[colIndex] || '';
      if (!segment) continue;
      if (labelRegex.test(segment)) {
        let value = segment.replace(labelRegex, '').trim();
        const pieces = [];

        for (let j = i - 1; j >= 0 && pieces.length < maxLines; j--) {
          const prevParts = lines[j].split('|').map(p => p.trim());
          const prevSeg = prevParts[colIndex] || '';
          if (!prevSeg) continue;
          if (labelRegex.test(prevSeg) || isLabelLine(prevSeg)) break;
          if (/^(SE DEBE|ESCRIBIR|PROPÓSITO|COMPETENCIA|HORAS|INFORMACIÓN DE LA UNIDAD)/i.test(prevSeg)) break;
          pieces.unshift(prevSeg);
        }

        if (value) pieces.push(value);
        for (let j = i + 1; j < lines.length; j++) {
          const nextParts = lines[j].split('|').map(p => p.trim());
          const nextSeg = nextParts[colIndex] || '';
          if (!nextSeg) continue;
          if (labelRegex.test(nextSeg) || isLabelLine(nextSeg)) break;
          if (/^(SE DEBE|ESCRIBIR|PROPÓSITO|COMPETENCIA|HORAS|INFORMACIÓN DE LA UNIDAD)/i.test(nextSeg)) break;
          pieces.push(nextSeg);
          if (pieces.length >= maxLines) break;
        }
        return cleanLabelValue(pieces.join(' '));
      }
    }
    return '';
  };

  const cleanLabelValue = (value) => {
    if (!value) return value;
    let cleaned = sanitizeText(value);
    cleaned = cleaned.replace(/^ESPECIALIDAD\s*[:\-]\s*/i, '').trim();
    cleaned = cleaned.replace(/\b(CUATRIMESTRE|GRUPO|DOCENTE\(S\)|DOCENTE|ASIGNATURA|MATERIA|PERIODO|FECHA|HORAS)\b.*$/i, '').trim();
    cleaned = cleaned.replace(/\b(SE DEBE|SE DEBEN|SE DEBE ESCRIBIR|SE DEBE INDICAR|SE DEBE DETALLAR|SE DEBE DESCRIBIR|ESCRIBIR|INDICAR|DETALLAR|DESCRIBIR)\b[\s\S]*$/i, '').trim();
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    return cleaned;
  };

  const isInstructionText = (value) => {
    if (!value) return false;
    return /(SE DEBE|ESCRIBIR|INDICAR|DETALLAR)/i.test(value.trim());
  };

  const extractCuatrimestre = (text) => {
    const match = findFirstMatch(text, [
      /CUATRIMESTRE\s*[:\(\-]\s*(\d+|PRIMERO|SEGUNDO|TERCERO|CUARTO|QUINTO|SEXTO|SÉPTIMO|SEPTIMO|OCTAVO|NOVENO|DÉCIMO|DECIMO|I{1,4}|V?I{0,3}|X)/i,
      /GRADO\s*[:\-\s]+(\d+|I{1,4}|V?I{0,3}|X)/i
    ]);

    if (match) {
      const value = match[1].toUpperCase();
      const mapping = {
        'PRIMERO': '1', 'SEGUNDO': '2', 'TERCERO': '3', 'CUARTO': '4', 'QUINTO': '5',
        'SEXTO': '6', 'SÉPTIMO': '7', 'SEPTIMO': '7', 'OCTAVO': '8', 'NOVENO': '9',
        'DÉCIMO': '10', 'DECIMO': '10', 'I': '1', 'II': '2', 'III': '3', 'IV': '4',
        'V': '5', 'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10'
      };
      return mapping[value] || value;
    }
    return '1';
  };

  const extractCarrera = (text, page1Lines) => {
    if (page1Lines && page1Lines.length > 0) {
      const labelIndex = page1Lines.findIndex(l => /PROGRAMA EDUCATIVO\s*:/i.test(l));
      if (labelIndex >= 0) {
        const parts = page1Lines[labelIndex].split('|').map(p => p.trim());
        const right = parts[1] || '';
        const prefixRight = right.replace(/DOCENTE\s*\(S\)\s*:\s*/i, '').trim();
        const prevParts = (page1Lines[labelIndex - 1] || '').split('|').map(p => p.trim());
        const prevLeft = prevParts[0] || '';
        const nextParts = (page1Lines[labelIndex + 1] || '').split('|').map(p => p.trim());
        const nextLeft = nextParts[0] || '';
        const combined = cleanLabelValue(`${prevLeft} ${prefixRight} ${nextLeft}`.trim());
        if (combined) return combined.substring(0, 80);
      }

      const fromHeader = getValueFromSeparatedLines(page1Lines, /PROGRAMA EDUCATIVO\s*:\s*/i, 0, 2);
      if (fromHeader) return fromHeader.substring(0, 80);
    }
    const byLabel = getValueFromLabelBlock(text, /PROGRAMA EDUCATIVO\s*[:\-]\s*(.*)$/i);
    const cleaned = cleanLabelValue(byLabel);
    if (cleaned) return cleaned.substring(0, 80);

    const match = findFirstMatch(text, [
      /PROGRAMA EDUCATIVO\s*[:\-]\s*\n?\s*([^\n]+)/i,
      /CARRERA\s*[:\-]\s*([^\n]+)/i,
      /LICENCIATURA EN\s*([^\n]+)/i,
      /INGENIER[ÍI]A EN\s*([^\n]+)/i,
      /TSU EN\s*([^\n]+)/i
    ]);

    if (match) {
      let carrera = sanitizeText(match[1].trim());
      carrera = carrera.split(/[-,\n]/)[0].trim();
      if (/^LICENCIATURA|^INGENIER[ÍI]A|^TSU/i.test(carrera)) {
        return carrera.substring(0, 80) || 'Licenciatura';
      }
      if (match[0].toUpperCase().includes('LICENCIATURA EN')) {
        return `Licenciatura en ${carrera}`.substring(0, 80);
      }
      if (match[0].toUpperCase().includes('INGENIER')) {
        return `Ingeniería en ${carrera}`.substring(0, 80);
      }
      return carrera.substring(0, 80) || 'Licenciatura';
    }
    return 'Licenciatura';
  };

  const extractEspecialidad = (text, page1Lines) => {
    if (page1Lines && page1Lines.length > 0) {
      const fromHeader = getValueFromSeparatedLines(page1Lines, /ESPECIALIDAD\s*:\s*/i, 0, 2);
      if (fromHeader && !isInstructionText(fromHeader)) return fromHeader.substring(0, 80);
    }
    const byLabel = getValueFromLabelBlock(text, /ESPECIALIDAD\s*[:\-]\s*(.*)$/i);
    const cleaned = cleanLabelValue(byLabel);
    if (cleaned && !isInstructionText(cleaned)) return cleaned.substring(0, 80);
    const match = findFirstMatch(text, [
      /ESPECIALIDAD\s*[:\-]\s*([^\n]+)/i
    ]);
    if (match) {
      const value = cleanLabelValue(match[1]);
      if (value && !isInstructionText(value)) return value.substring(0, 80);
    }
    return '';
  };

  const extractPeriodoEscolar = (text, page1Lines) => {
    if (page1Lines && page1Lines.length > 0) {
      const line = page1Lines.find(l => /CUATRIMESTRE\s*:/i.test(l) || /PERIODO ESCOLAR\s*:/i.test(l));
      if (line) {
        const parts = line.split('|').map(p => p.trim());
        const right = parts[1] || '';
        if (right) {
        const cleaned = cleanLabelValue(right.replace(/PERIODO ESCOLAR\s*:/i, '').trim());
        if (cleaned && !isInstructionText(cleaned)) return cleaned.substring(0, 40);
        }
        const left = parts[0] || '';
        const match = left.match(/CUATRIMESTRE\s*:\s*[^|]*\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*[-–]\s*(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*\d{4}/i);
        if (match) return match[0].replace(/CUATRIMESTRE\s*:\s*/i, '').trim();
      }
    }
    const byLabel = getValueFromLabelBlock(text, /PERIODO ESCOLAR\s*[:\-]\s*(.*)$/i);
    if (byLabel) {
      const cleaned = cleanLabelValue(byLabel).substring(0, 40);
      if (!isInstructionText(cleaned)) return cleaned;
    }

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const monthRange = /(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*[-–]\s*(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*\d{4}/i;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/PERIODO ESCOLAR/i.test(line)) {
        for (let j = i + 1; j < lines.length; j++) {
          const next = lines[j];
          if (!next) continue;
          if (isInstructionText(next)) continue;
          const match = next.match(monthRange);
          if (match) return match[0].trim();
        }
      }
    }

    const cuatriLine = getValueFromLabelBlock(text, /CUATRIMESTRE\s*[:\-]\s*(.*)$/i);
    const cuatriMatch = cuatriLine.match(/(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*[-–]\s*(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s*\d{4}/i);
    if (cuatriMatch) return cuatriMatch[0].trim();

    const anyRange = text.match(monthRange);
    if (anyRange) return anyRange[0].trim();
    return '';
  };

  const extractGrupo = (text) => {
    const match = findFirstMatch(text, [
      /GRUPO\s*\(S\)?\s*[:\-\s]+([A-Z]-?\d+)/i,
      /GRUPO\s*[:\-\s]+([A-Z]\s?\d+)/i
    ]);
    if (match) return match[1].replace(/\s+/g, '').trim();
    return 'A1';
  };

  const extractDocente = (text, page1Lines) => {
    if (page1Lines && page1Lines.length > 0) {
      const fromHeader = getValueFromSeparatedLines(page1Lines, /DOCENTE\s*\(S\)\s*:\s*/i, 1, 2);
      if (fromHeader && !isInstructionText(fromHeader)) return fromHeader.substring(0, 60);
    }
    const byLabel = getValueFromLabelBlock(text, /DOCENTE\s*\(S\)\s*[:\-]\s*(.*)$/i);
    const cleaned = cleanLabelValue(byLabel);
    if (cleaned && !isInstructionText(cleaned)) return cleaned.substring(0, 60);

    const match = findFirstMatch(text, [
      /DOCENTE\(S\)\s*[:\-]\s*\n?\s*([^\n]+)/i,
      /NOMBRE DEL DOCENTE\s*[:\-\s]+([^\n]+)/i,
      /DOCENTE\s*\(S\)?\s*[:\-\s]+([^\n]+)/i,
      /PROFESOR\s*[:\-\s]+([^\n]+)/i
    ]);

    if (match) {
      let docente = sanitizeText(match[1].trim());
      const lines = docente.split(/\n/);
      docente = lines[0].trim();
      docente = docente.split(/[,;•]/)[0].trim();
      docente = docente.replace(/\b(Jefe|Coordinador|Tutor)\b.*$/i, '').trim();
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
    title = title.replace(/^(Unidad|UNIDAD)\s*\d+\s*[:.\-]?\s*/i, '').trim();
    return `UNIDAD ${index}: ${title || 'SIN TÍTULO'}`;
  };

  const parseDateRangeFromLine = (line) => {
    const meses = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };
    const match = line.match(/(\d{1,2})\s*(?:al|a|-|–)\s*(\d{1,2})\s*de\s*([a-záéíóúñ]+)\s*de\s*(\d{4})/i);
    if (!match) return null;
    const d1 = parseInt(match[1], 10);
    const d2 = parseInt(match[2], 10);
    const month = meses[match[3].toLowerCase()];
    const year = parseInt(match[4], 10);
    if (Number.isNaN(d1) || Number.isNaN(d2) || Number.isNaN(month) || Number.isNaN(year)) return null;
    const start = new Date(year, month, d1);
    const end = new Date(year, month, d2);
    return { start, end };
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const extractUnits = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const units = [];
    const unitHeaderIdx = [];

    lines.forEach((line, idx) => {
      if (/^NOMBRE DE LA UNIDAD DE APRENDIZAJE\s*:/i.test(line)) {
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

      const weekNums = [];
      const weekRanges = [];
      let examLabel = '';
      block.forEach(line => {
        const weekMatch = line.match(/SEMANA\s*:?\s*(\d{1,2})/i);
        if (weekMatch) weekNums.push(parseInt(weekMatch[1], 10));
        const range = parseDateRangeFromLine(line);
        if (range) weekRanges.push(range);
        if (/EXAMEN\s+DE\s+UNIDAD/i.test(line) || /EXAMEN\s+UNIDAD/i.test(line)) {
          examLabel = `Examen unidad ${u + 1}`;
        }
      });

      let fechaPlaneada = '';
      let fechaReal = '';
      let fechaEvalPlaneada = '';
      let fechaEvalReal = '';
      if (weekRanges.length > 0) {
        const starts = weekRanges.map(r => r.start.getTime());
        const ends = weekRanges.map(r => r.end.getTime());
        const minStart = new Date(Math.min(...starts));
        const maxEnd = new Date(Math.max(...ends));
        fechaPlaneada = `${formatDate(minStart)} al ${formatDate(maxEnd)}`;
        fechaEvalPlaneada = formatDate(maxEnd);
      }

      const minWeek = weekNums.length ? Math.min(...weekNums) : null;
      const maxWeek = weekNums.length ? Math.max(...weekNums) : null;
      if (!fechaPlaneada && minWeek && maxWeek) {
        fechaPlaneada = `Semana ${minWeek} al ${maxWeek}`;
      }

      units.push({
        titulo: title,
        fechaPlaneada,
        fechaReal: '',
        fechaEvalPlaneada,
        fechaEvalReal
      });
    }
    return units;
  };

  const extractMateria = (text, page1Lines) => {
    if (page1Lines && page1Lines.length > 0) {
      const labelLineIndex = page1Lines.findIndex(l => /NOMBRE DE LA ASIGNATURA\s*:/i.test(l));
      if (labelLineIndex >= 0) {
        const parts = page1Lines[labelLineIndex].split('|').map(p => p.trim());
        const labelPart = parts.find(p => /NOMBRE DE LA ASIGNATURA\s*:/i.test(p)) || '';
        let valueInline = labelPart.replace(/NOMBRE DE LA ASIGNATURA\s*:/i, '').trim();
        if (!valueInline) {
          const groupPart = parts.find(p => /GRUPO\s*\(S\)\s*:/i.test(p)) || '';
          if (groupPart) {
            valueInline = groupPart.split(/GRUPO\s*\(S\)\s*:/i)[1] || '';
          }
        }
        if (valueInline) {
          valueInline = valueInline.replace(/\b[A-Z]\s?_?\d+\b.*$/i, '').trim();
          if (valueInline) return valueInline.substring(0, 100);
        }
      }

      let fromHeader = getValueFromSeparatedLines(page1Lines, /NOMBRE DE LA ASIGNATURA\s*:\s*/i, 0, 1);
      if (fromHeader) {
        if (/GRUPO\s*\(S\)\s*:/i.test(fromHeader)) {
          const afterGroup = fromHeader.split(/GRUPO\s*\(S\)\s*:/i)[1] || '';
          const cleanedAfter = afterGroup.replace(/\b[A-Z]\s?_?\d+\b.*$/i, '').trim();
          if (cleanedAfter) return cleanedAfter.substring(0, 100);
        }
        fromHeader = fromHeader.replace(/\bGRUPO\b.*$/i, '').trim();
        if (fromHeader) return fromHeader.substring(0, 100);
      }
    }
    const byLabel = getValueFromLabelBlock(text, /NOMBRE DE LA ASIGNATURA\s*[:\-]\s*(.*)$/i);
    const cleaned = cleanLabelValue(byLabel);
    if (cleaned) return cleaned.substring(0, 100);
    return extractField(text, [
      /NOMBRE DE LA ASIGNATURA\s*[:\-\s]+([^\n]+)/i,
      /NOMBRE DE LA ASIGNATURA\s*[:\-]\s*\n?\s*([^\n]+)/i,
      /NOMBRE DE LA MATERIA\s*[:\-\s]+([^\n]+)/i,
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

    const textDate = raw.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i);
    if (textDate) {
      const day = textDate[1].padStart(2, '0');
      const month = meses[textDate[2].toLowerCase()];
      const year = textDate[3];
      if (month) return `${year}-${month}-${day}`;
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

    const meses = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
    };

    const semana1 = text.match(/SEMANA\s+1[\s\S]*?(\d{1,2})\s+(?:AL\s+\d{1,2}\s+)?DE\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
    const semana12 = text.match(/SEMANA\s+12[\s\S]*?(\d{1,2})\s+(?:AL\s+\d{1,2}\s+)?DE\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);

    let inicio = `${defaultYear}-01-13`;
    let fin = `${defaultYear}-04-17`;

    if (semana1 && semana1[2]) {
      const day = semana1[1].padStart(2, '0');
      const month = meses[semana1[2].toLowerCase()];
      inicio = `${defaultYear}-${month}-${day}`;
    }

    if (semana12 && semana12[2]) {
      const day = semana12[1].padStart(2, '0');
      const month = meses[semana12[2].toLowerCase()];
      fin = `${defaultYear}-${month}-${day}`;
    }

    return { fechaInicio: inicio, fechaFin: fin };
  };

  const handleExtract = async () => {
    if (file) {
      try {
        setIsExtracting(true);
        let fullText = '';
        let page1Lines = null;

        if (file.type === 'application/pdf') {
          const result = await extractPdfText(file);
          fullText = result.fullText;
          page1Lines = result.page1Lines;
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          fullText = await extractWordText(file);
        }

        const cleanText = normalizeTextForParsing(fullText);
        const dates = extractDates(cleanText);
        const unidades = extractUnits(cleanText);

        const data = {
          carrera: extractCarrera(cleanText, page1Lines),
          especialidad: extractEspecialidad(cleanText, page1Lines),
          grado: extractCuatrimestre(cleanText),
          grupo: extractGrupo(cleanText),
          nombMateria: extractMateria(cleanText, page1Lines),
          fechaInicio: dates.fechaInicio,
          fechaFin: dates.fechaFin,
          periodoEscolar: extractPeriodoEscolar(cleanText, page1Lines),
          docente: extractDocente(cleanText, page1Lines),
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

        setEditedData(data);
        setExtractedData(data);
        setShowPreview(true);
      } catch (error) {
        console.error('Error extrayendo documento:', error);
        const detail = error?.message ? ` Detalle: ${error.message}` : '';
        alert(`Error al procesar el archivo. Verifica que el PDF no esté protegido ni dañado.${detail}`);
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const handleDataChange = (field, value) => {
    setEditedData({
      ...editedData,
      [field]: value,
    });
  };

  const updateUnidad = (index, field, value) => {
    const updated = (editedData?.unidades || []).map((u, i) => i === index ? { ...u, [field]: value } : u);
    setEditedData({ ...editedData, unidades: updated });
  };

  const addUnidad = () => {
    const next = [...(editedData?.unidades || []), { titulo: '', fechaPlaneada: '', fechaReal: '', fechaEvalPlaneada: '', fechaEvalReal: '' }];
    setEditedData({ ...editedData, unidades: next });
  };

  const removeUnidad = (index) => {
    const next = (editedData?.unidades || []).filter((_, i) => i !== index);
    setEditedData({ ...editedData, unidades: next.length ? next : [{ titulo: '', fechaPlaneada: '', fechaReal: '', fechaEvalPlaneada: '', fechaEvalReal: '' }] });
  };

  const handleSave = (estado) => {
    if (editedData) {
      const periodo = editedData.grado || '1';
      onSave({
        ...editedData,
        id: Date.now(),
        periodo: `2025-${periodo}`,
        estado: estado,
        archivo: file?.name,
        archivedDate: null,
        isArchived: false,
      });
      resetModal();
    }
  };

  const resetModal = () => {
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    setShowPreview(false);
    setShowExitConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-xl font-bold">{t('modal_new_title')}</h2>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="text-white text-2xl hover:text-gray-200 transition"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!showPreview ? (
            <>
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-3 inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">upload_file</span>
                  {t('modal_upload')}
                </label>
                <div className="border-2 border-dashed border-teal-300 rounded-lg p-6 text-center hover:border-teal-500 transition cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFile = e.dataTransfer.files[0];
                    const isPdf = droppedFile?.type === 'application/pdf' || droppedFile?.name?.toLowerCase().endsWith('.pdf');
                    const isDocx = droppedFile?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || droppedFile?.name?.toLowerCase().endsWith('.docx');
                    if (droppedFile && (isPdf || isDocx)) {
                      setFile(droppedFile);
                    } else {
                      alert('Por favor arrastra un archivo PDF o Word válido');
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-input"
                  />
                  <label htmlFor="pdf-input" className="cursor-pointer">
                    {file ? (
                      <p className="text-green-600 font-semibold inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        {file.name}
                      </p>
                    ) : (
                      <>
                        <p className="text-teal-600 font-semibold mb-2">{t('modal_drag')}</p>
                        <p className="text-gray-500 text-sm">{t('modal_support')}</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {file && (
                <button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">
                      {isExtracting ? 'hourglass_top' : 'manage_search'}
                    </span>
                    {isExtracting ? t('modal_extracting') : t('modal_extract')}
                  </span>
                </button>
              )}

              {!file && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mt-4 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">info</span>
                    {t('modal_info')}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">preview</span>
                {t('modal_preview_title')}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">{t('modal_carrera')}</label>
                  <input
                    type="text"
                    value={editedData?.carrera || ''}
                    onChange={(e) => handleDataChange('carrera', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">{t('modal_especialidad')}</label>
                  <div className="flex flex-col gap-2">
                    <select
                      value={editedData?.especialidad || ''}
                      onChange={(e) => handleDataChange('especialidad', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    >
                      <option value="">{t('specialty_select')}</option>
                      {getSpecialtiesForCareer(editedData?.carrera).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        placeholder={t('specialty_new')}
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                      />
                      <button
                        type="button"
                        onClick={addSpecialtyForCareer}
                        className="bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg px-3 py-2 inline-flex items-center justify-center"
                        title={t('specialty_add')}
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                      </button>
                      {(editedData?.especialidad || '').length > 0 && (
                        <button
                          type="button"
                          onClick={() => removeSpecialtyForCareer(editedData?.especialidad)}
                          className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-3 py-2 inline-flex items-center justify-center"
                          title={t('specialty_delete')}
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">{t('modal_grado')}</label>
                    <input
                      type="text"
                      value={editedData?.grado || ''}
                      onChange={(e) => handleDataChange('grado', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">{t('modal_grupo')}</label>
                    <input
                      type="text"
                      value={editedData?.grupo || ''}
                      onChange={(e) => handleDataChange('grupo', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">{t('modal_materia')}</label>
                  <input
                    type="text"
                    value={editedData?.nombMateria || ''}
                    onChange={(e) => handleDataChange('nombMateria', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">{t('modal_horas')}</label>
                  <input
                    type="text"
                    value={editedData?.horasTotales || ''}
                    onChange={(e) => handleDataChange('horasTotales', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">{t('modal_docente')}</label>
                  <input
                    type="text"
                    value={editedData?.docente || ''}
                    onChange={(e) => handleDataChange('docente', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">{t('turno')}</label>
                    <select
                      value={editedData?.turno || ''}
                      onChange={(e) => handleDataChange('turno', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    >
                      <option value="">{t('turno_select')}</option>
                      <option value="Matutino">{t('turno_m')}</option>
                      <option value="Vespertino">{t('turno_v')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">{t('fecha_elaboracion')}</label>
                    <input
                      type="date"
                      value={editedData?.fechaElaboracion || ''}
                      onChange={(e) => handleDataChange('fechaElaboracion', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-gray-700 font-semibold">{t('units_title')}</label>
                    <button
                      type="button"
                      onClick={addUnidad}
                      className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                      {t('unit_add')}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(editedData?.unidades || []).map((u, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-semibold text-gray-700">{t('unit_name')} {idx + 1}</div>
                          <button
                            type="button"
                            onClick={() => removeUnidad(idx)}
                            className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            {t('unit_remove')}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={u.titulo || ''}
                          onChange={(e) => updateUnidad(idx, 'titulo', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
                          placeholder={`UNIDAD ${idx + 1}:`}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('unit_date_plan')}</label>
                            <input
                              type="text"
                              value={u.fechaPlaneada || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaPlaneada', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('unit_date_real')}</label>
                            <input
                              type="text"
                              value={u.fechaReal || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaReal', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('unit_eval_plan')}</label>
                            <input
                              type="text"
                              value={u.fechaEvalPlaneada || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaEvalPlaneada', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">{t('unit_eval_real')}</label>
                            <input
                              type="text"
                              value={u.fechaEvalReal || ''}
                              onChange={(e) => updateUnidad(idx, 'fechaEvalReal', e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg transition shadow-sm border border-gray-200"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    {t('modal_volver')}
                  </span>
                </button>
                <button
                  onClick={() => handleSave('Completado')}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-lg transition shadow-sm"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">send</span>
                    {t('modal_enviar')}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        <Popup
          open={showExitConfirm}
          title={t('exit_title')}
          message={t('exit_message')}
          variant="confirm"
          confirmText={t('exit_save_draft')}
          cancelText={t('exit_cancel')}
          onConfirm={() => handleSave('Borrador')}
          onCancel={() => setShowExitConfirm(false)}
          extraActions={[
            {
              label: t('exit_leave'),
              onClick: resetModal,
              className: 'px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50'
            }
          ]}
        />
      </div>
    </div>
  );
}

export default NuevaPlaneacionModal;

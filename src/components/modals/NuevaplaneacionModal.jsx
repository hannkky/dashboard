import * as pdfjsLib from 'pdfjs-dist';
import { useState } from 'react';

// Configurar worker del PDF.js usando archivo de public
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

function NuevaPlaneacionModal({ isOpen, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || selectedFile.name.endsWith('.docx'))) {
      setFile(selectedFile);
      setExtractedData(null);
      setShowPreview(false);
    } else {
      alert('Por favor selecciona un archivo PDF o Word válido');
    }
  };

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

  const extractPdfText = async (pdfFile) => {
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      return fullText;
    } catch (error) {
      console.error('Error extracting PDF:', error);
      throw error;
    }
  };;

  const extractField = (text, regex, defaultValue) => {
    const match = text.match(regex);
    if (match) {
      const index = match.index + match[0].length;
      const nextText = text.substring(index, index + 100);
      const extracted = nextText.split(/[\n,;]/)[0].trim();
      return extracted.substring(0, extracted.length > 50 ? 50 : extracted.length) || defaultValue;
    }
    return defaultValue;
  };

  const handleExtract = async () => {
    if (file) {
      try {
        setIsExtracting(true);
        let fullText = '';
        
        if (file.type === 'application/pdf') {
          fullText = await extractPdfText(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          fullText = await extractWordText(file);
        }

        // Extraer datos usando regex
        const data = {
          carrera: extractField(fullText, /CARRERA|PROGRAMA|LICENCIATURA|programa educativo/i, 'INGENIERÍA EN LOGÍSTICA'),
          grado: extractField(fullText, /GRADO|SEMESTRE|CUATRIMESTRE/i, '2°'),
          grupo: extractField(fullText, /GRUPO\s*\(|GRUPO\s*:|GRUPO\s*A/i, 'A1'),
          nombMateria: extractField(fullText, /NOMBRE DE LA ASIGNATURA|ASIGNATURA|materia/i, 'LOGÍSTICA DE ABASTECIMIENTO'),
          fecha: extractField(fullText, /FECHA|PERIODO ESCOLAR|ENERO/i, new Date().toISOString().split('T')[0]),
          docente: extractField(fullText, /DOCENTE|PROFESOR|MAESTRO|CATEDRÁTICO/i, 'Dr. Juan Pérez'),
          horasTotales: extractField(fullText, /HORAS TOTALES|HORAS\s*:|total de horas/i, '75'),
        };

        setEditedData(data);
        setExtractedData(data);
        setShowPreview(true);
      } catch (error) {
        console.error('Error extrayendo documento:', error);
        alert('Error al procesar el archivo: ' + error.message);
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

  const handleSave = (estado) => {
    if (editedData) {
      onSave({
        ...editedData,
        id: Date.now(),
        periodo: editedData.fecha.substring(0, 4) + '-' + (Math.ceil(parseInt(editedData.fecha.substring(5, 7)) / 4)),
        estado: estado,
        archivo: file?.name,
      });
      resetModal();
    }
  };

  const resetModal = () => {
    setFile(null);
    setExtractedData(null);
    setEditedData(null);
    setShowPreview(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white text-xl font-bold">Nueva Planeación</h2>
          <button
            onClick={resetModal}
            className="text-white text-2xl hover:text-gray-200 transition"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {!showPreview ? (
            <>
              {/* File Upload Section */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-3">
                  📄 Selecciona archivo PDF o Word de Planeación
                </label>
                <div className="border-2 border-dashed border-teal-300 rounded-lg p-6 text-center hover:border-teal-500 transition cursor-pointer"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.docx'))) {
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
                      <p className="text-green-600 font-semibold">✓ {file.name}</p>
                    ) : (
                      <>
                        <p className="text-teal-600 font-semibold mb-2">Arrastra el PDF o Word aquí o haz clic</p>
                        <p className="text-gray-500 text-sm">Soporta archivos PDF y Word (.docx)</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Extract Button */}
              {file && (
                <button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                  {isExtracting ? '⏳ Extrayendo datos...' : '🔍 Extraer Datos del PDF'}
                </button>
              )}

              {/* Info Message */}
              {!file && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mt-4 text-sm">
                  💡 El sistema extraerá automáticamente: carrera, grado, grupo, nombre de materia, fecha, docente y horas totales.
                </div>
              )}
            </>
          ) : (
            <>
              {/* Preview Section */}
              <h3 className="text-lg font-bold text-gray-800 mb-4">👀 Vista Previa - Edita los datos si es necesario</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Carrera</label>
                  <input
                    type="text"
                    value={editedData?.carrera || ''}
                    onChange={(e) => handleDataChange('carrera', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Grado</label>
                    <input
                      type="text"
                      value={editedData?.grado || ''}
                      onChange={(e) => handleDataChange('grado', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Grupo</label>
                    <input
                      type="text"
                      value={editedData?.grupo || ''}
                      onChange={(e) => handleDataChange('grupo', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Nombre de Materia</label>
                  <input
                    type="text"
                    value={editedData?.nombMateria || ''}
                    onChange={(e) => handleDataChange('nombMateria', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Fecha</label>
                    <input
                      type="date"
                      value={editedData?.fecha || ''}
                      onChange={(e) => handleDataChange('fecha', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Horas Totales</label>
                    <input
                      type="text"
                      value={editedData?.horasTotales || ''}
                      onChange={(e) => handleDataChange('horasTotales', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Docente</label>
                  <input
                    type="text"
                    value={editedData?.docente || ''}
                    onChange={(e) => handleDataChange('docente', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPreview(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
                >
                  ← Volver
                </button>
                <button
                  onClick={() => handleSave('Borrador')}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  💾 Guardar como Borrador
                </button>
                <button
                  onClick={() => handleSave('Completado')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  ✉️ Enviar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NuevaPlaneacionModal;

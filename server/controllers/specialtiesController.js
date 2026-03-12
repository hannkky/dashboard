let specialtiesByCareer = {};

const normalizeKey = (value) => (value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

export const getSpecialties = (req, res) => {
  res.json({ success: true, data: specialtiesByCareer });
};

export const addSpecialty = (req, res) => {
  const { carrera, especialidad } = req.body || {};
  const careerKey = normalizeKey(carrera);
  const nextValue = (especialidad || '').trim();
  if (!careerKey || !nextValue) {
    return res.status(400).json({ error: 'Carrera y especialidad son requeridas' });
  }
  const current = specialtiesByCareer[careerKey] || [];
  if (!current.some(s => s.toLowerCase() === nextValue.toLowerCase())) {
    specialtiesByCareer = { ...specialtiesByCareer, [careerKey]: [...current, nextValue] };
  }
  res.json({ success: true, data: specialtiesByCareer });
};

export const removeSpecialty = (req, res) => {
  const { carrera, especialidad } = req.query || {};
  const careerKey = normalizeKey(carrera);
  if (!careerKey || !especialidad) {
    return res.status(400).json({ error: 'Carrera y especialidad son requeridas' });
  }
  const current = specialtiesByCareer[careerKey] || [];
  const next = current.filter(s => s !== especialidad);
  specialtiesByCareer = { ...specialtiesByCareer, [careerKey]: next };
  res.json({ success: true, data: specialtiesByCareer });
};

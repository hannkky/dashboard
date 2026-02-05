import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import planningRoutes from './routes/planning.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/planning', planningRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📝 API Health: http://localhost:${PORT}/api/health`);
});

export default app;

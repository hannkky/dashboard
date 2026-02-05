# 🎓 Automatización de Planeaciones Académicas

Sistema web para automatizar el procesamiento y gestión de planeaciones académicas.

## 📚 Estructura del Proyecto

```
automatizacion-planeaciones/
├── src/                          # Frontend (React + Vite)
│   ├── pages/                   # Páginas principales
│   │   ├── LoginPage.jsx
│   │   └── DashboardPage.jsx
│   ├── components/              # Componentes reutilizables
│   │   ├── Sidebar.jsx
│   │   ├── MainContent.jsx
│   │   └── pages/              # Sub-páginas del dashboard
│   │       ├── HistorialPage.jsx
│   │       ├── ReportesPage.jsx
│   │       └── ConfiguracionPage.jsx
│   ├── services/                # Servicios de API
│   │   └── api.js
│   ├── App.jsx                  # Componente raíz
│   ├── main.jsx                 # Punto de entrada
│   └── index.css                # Estilos globales
├── server/                       # Backend (Express + Node.js)
│   ├── controllers/             # Lógica de negocio
│   │   ├── authController.js
│   │   └── planningController.js
│   ├── routes/                  # Definición de rutas
│   │   ├── auth.js
│   │   └── planning.js
│   ├── middleware/              # Middlewares
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── app.js                   # Aplicación Express
│   ├── package.json
│   └── .env.example
├── index.html                    # HTML principal
├── package.json                  # Dependencias Frontend
├── vite.config.js               # Configuración Vite
├── tailwind.config.js           # Configuración Tailwind
├── postcss.config.js            # Configuración PostCSS
└── .env                         # Variables de entorno

```

## 🚀 Quick Start

### 1. Instalar dependencias

#### Frontend
```bash
npm install
```

#### Backend
```bash
cd server
npm install
cd ..
```

### 2. Ejecutar en desarrollo

#### Terminal 1 - Frontend (http://localhost:5173)
```bash
npm run dev
```

#### Terminal 2 - Backend (http://localhost:3001)
```bash
cd server
npm run dev
```

### 3. Acceder a la aplicación

- **Frontend:** http://localhost:5173
- **API Health:** http://localhost:3001/api/health

## 🔐 Credenciales de Prueba

**Usuario:** `admin`
**Contraseña:** `admin123`

O

**Usuario:** `docente`
**Contraseña:** `docente123`

## 📋 Características Implementadas

### Frontend
✅ Pantalla de Login  
✅ Dashboard con Sidebar  
✅ Historial de Planeaciones  
✅ Reportes y Estadísticas  
✅ Configuración del Sistema  
✅ Diseño Responsive  
✅ Interfaz Moderna (Tailwind CSS)

### Backend
✅ Autenticación básica (sin DB)  
✅ CRUD de Planeaciones  
✅ Manejo de errores  
✅ CORS habilitado  
✅ Rutas protegidas  
✅ API REST completa

## 🔌 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión

### Planeaciones
- `GET /api/planning` - Obtener todas las planeaciones
- `GET /api/planning/:id` - Obtener una planeación
- `POST /api/planning` - Crear planeación
- `PUT /api/planning/:id` - Actualizar planeación
- `DELETE /api/planning/:id` - Eliminar planeación
- `POST /api/planning/upload` - Subir archivo

## 🛠️ Tecnologías

### Frontend
- **React 18** - Librería de UI
- **Vite** - Build tool rápido
- **TailwindCSS** - Utility-first CSS
- **Fetch API** - Llamadas HTTP

### Backend
- **Express.js** - Framework web
- **Node.js** - Runtime
- **CORS** - Comunicación entre dominios

## 📝 Notas Importantes

1. **Sin Base de Datos:** Los datos se almacenan en memoria (se pierden al reiniciar)
2. **Autenticación Simulada:** Sin JWT real (solo tokens de sesión)
3. **OCR No Implementado:** Solo estructura base para futuros
4. **Producción:** Para producción necesita:
   - Base de datos (MySQL, PostgreSQL)
   - Validación JWT real
   - Hosting (AWS, Vercel, Railway, etc)

## 🔮 Próximas Mejoras

- [ ] Integración con base de datos real
- [ ] OCR con Tesseract.js
- [ ] Generación de Excel
- [ ] Autenticación con JWT
- [ ] Tests unitarios
- [ ] Docker setup
- [ ] CI/CD pipeline
- [ ] Documentación Swagger

## 📧 Contacto

Para preguntas o sugerencias sobre el proyecto, contactar al equipo de desarrollo.

---

**Estado:** 🟢 En Desarrollo  
**Versión:** 1.0.0  
**Última actualización:** Febrero 2025

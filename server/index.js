// Desarrollado por: Agustín Insunsa

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');

const { noEncontrado, manejadorErrores } = require('./src/middleware/errores');

const healthRoutes = require('./src/routes/health.routes');
const authRoutes = require('./src/routes/auth.routes');
const ordenesRoutes = require('./src/routes/ordenes.routes');
const serviciosRoutes = require('./src/routes/servicios.routes');
const checklistsRoutes = require('./src/routes/checklists.routes');
const materialesRoutes = require('./src/routes/materiales.routes');
const evidenciasRoutes = require('./src/routes/evidencias.routes');
const presupuestosRoutes = require('./src/routes/presupuestos.routes');
const adminRoutes = require('./src/routes/admin.routes');
const { reintentarEnvios } = require('./src/controllers/servicios.controller');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const carpetaUploads = path.join(__dirname, 'uploads');

process.env.ERP_URL = process.env.ERP_URL || 'http://localhost:4000';
process.env.UPLOADS_DIR = process.env.UPLOADS_DIR || carpetaUploads;
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/ordenes', ordenesRoutes);
app.use('/api/v1/servicios', serviciosRoutes);
app.use('/api/v1/checklists', checklistsRoutes);
app.use('/api/v1/materiales', materialesRoutes);
app.use('/api/v1/evidencias', evidenciasRoutes);
app.use('/api/v1/presupuestos', presupuestosRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(noEncontrado);
app.use(manejadorErrores);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });

  const reintentos = setInterval(() => {
    reintentarEnvios().catch((error) => {
      console.error('Error en el worker de envíos:', error.message);
    });
  }, 60000);
  reintentos.unref();
}

module.exports = app;

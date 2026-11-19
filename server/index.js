require('dotenv').config();
const express = require('express');
const cors = require('cors');

const healthRoutes = require('./src/routes/health.routes');
// Rutas pendientes (Backend): al crear cada archivo, descomentar su línea.
const authRoutes = require('./src/routes/auth.routes');                 // HU-01 login
// const ordenesRoutes = require('./src/routes/ordenes.routes');           // HU-02 mis trabajos
// const serviciosRoutes = require('./src/routes/servicios.routes');       // HU-03, HU-04, HU-07
// const materialesRoutes = require('./src/routes/materiales.routes');     // HU-05
// const presupuestosRoutes = require('./src/routes/presupuestos.routes'); // HU-08

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Cada archivo de routes se "monta" aquí con su prefijo.
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/ordenes', ordenesRoutes);
// app.use('/api/v1/servicios', serviciosRoutes);
// app.use('/api/v1/materiales', materialesRoutes);
// app.use('/api/v1/presupuestos', presupuestosRoutes);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

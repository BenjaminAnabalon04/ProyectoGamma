const express = require('express');

const app = express();
const PORT = process.env.PORT || 4000;

// Las hojas pueden traer fotos en base64, por eso el límite alto.
app.use(express.json({ limit: '20mb' }));

// Hojas ya recibidas: si llega la misma de nuevo (reintento), se responde el mismo código.
const recibidas = new Map();
let contador = 1000;

// Para comprobar que el ERP está vivo.
app.get('/erp/estado', (req, res) => {
  res.json({ status: 'ok', hojas_recibidas: recibidas.size });
});

// Recibe una hoja de servicio desde el servidor de Gamma.
app.post('/erp/servicios', (req, res) => {
  // Con FALLAR=1 el ERP responde error, para probar el reintento.
  if (process.env.FALLAR === '1') {
    return res.status(503).json({ recibido: false, mensaje: 'ERP no disponible (simulado)' });
  }

  const hoja = req.body || {};
  const idHoja = hoja.id_hoja;

  if (!idHoja) {
    return res.status(400).json({ recibido: false, mensaje: 'Falta id_hoja' });
  }

  if (!recibidas.has(idHoja)) {
    contador += 1;
    recibidas.set(idHoja, `HS-ERP-${contador}`);
    console.log(`Hoja recibida: ${idHoja} -> ${recibidas.get(idHoja)}`);
  }

  res.json({ recibido: true, codigo_hoja_erp: recibidas.get(idHoja) });
});

app.listen(PORT, () => {
  console.log(`ERP simulado escuchando en http://localhost:${PORT}`);
});
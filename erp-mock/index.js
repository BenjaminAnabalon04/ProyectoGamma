// Desarrollado por: Benjamín Anabalón

const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(express.json({ limit: '20mb' }));

const recibidas = new Map();
let contador = 1000;

app.get('/erp/estado', (req, res) => {
  res.json({ status: 'ok', hojas_recibidas: recibidas.size });
});

app.post('/erp/servicios', (req, res) => {
  if (process.env.FALLAR === '1') {
    return res.status(503).json({ recibido: false, mensaje: 'ERP no disponible (simulado)' });
  }

  const idHoja = req.body?.id_hoja;
  if (!idHoja) {
    return res.status(400).json({ recibido: false, mensaje: 'Falta id_hoja' });
  }

  if (!recibidas.has(idHoja)) {
    contador += 1;
    recibidas.set(idHoja, `HS-ERP-${contador}`);
    console.log(`Hoja recibida: ${idHoja} -> ${recibidas.get(idHoja)}`);
  }

  return res.json({ recibido: true, codigo_hoja_erp: recibidas.get(idHoja) });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ERP simulado escuchando en http://localhost:${PORT}`);
  });
}

module.exports = app;

// Desarrollado por: Agustín Insunsa

const express = require('express');
const { verificarToken } = require('../middleware/auth');
const { misTrabajos, obtenerOrden, obtenerPorQr } = require('../controllers/ordenes.controller');

const router = express.Router();

router.use(verificarToken);

router.get('/', misTrabajos);
router.get('/por-qr/:codigo', obtenerPorQr);
router.get('/:id_orden', obtenerOrden);

module.exports = router;

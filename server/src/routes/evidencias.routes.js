// Desarrollado por: Aaron Ponse

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { registrarEvidencia, listarEvidencias } = require('../controllers/evidencias.controller');

router.post('/', verificarToken, registrarEvidencia);
router.get('/:id_hoja', verificarToken, listarEvidencias);

module.exports = router;

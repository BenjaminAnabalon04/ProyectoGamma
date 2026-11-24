// Desarrollado por: Agustín Insunsa

const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth');
const { resumen, listarHojas } = require('../controllers/admin.controller');

router.use(verificarToken, verificarRol('administrador'));

router.get('/resumen', resumen);
router.get('/hojas', listarHojas);

module.exports = router;

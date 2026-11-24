// Desarrollado por: Aaron Ponse

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
  buscarMateriales,
  registrarConsumo,
  listarConsumos,
} = require('../controllers/materiales.controller');

router.get('/', verificarToken, buscarMateriales);
router.post('/consumos', verificarToken, registrarConsumo);
router.get('/consumos/:id_hoja', verificarToken, listarConsumos);

module.exports = router;

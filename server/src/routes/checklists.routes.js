const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
  obtenerChecklist,
  guardarRespuestas,
} = require('../controllers/checklists.controller');

// Soporta tanto GET /api/v1/checklists?id_hoja=... o ?tipo_servicio=... como GET /api/v1/checklists/:id_checklist
router.get('/', verificarToken, obtenerChecklist);
router.get('/:id_checklist', verificarToken, obtenerChecklist);
router.put('/respuestas/:id_hoja', verificarToken, guardarRespuestas);

module.exports = router;
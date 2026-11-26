// Desarrollado por: Agustín Insunsa

const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/auth');
const {
  listarPresupuestos,
  crearPresupuesto,
  obtenerPresupuesto,
  guardarCosteo,
  aprobar,
  rechazar,
} = require('../controllers/presupuestos.controller');

router.use(verificarToken);

router.get('/', listarPresupuestos);
router.post('/', crearPresupuesto);
router.get('/:id_presupuesto', obtenerPresupuesto);
router.put('/:id_presupuesto/costeo', verificarRol('administrador'), guardarCosteo);
router.put('/:id_presupuesto/aprobar', verificarRol('administrador'), aprobar);
router.put('/:id_presupuesto/rechazar', verificarRol('administrador'), rechazar);

module.exports = router;

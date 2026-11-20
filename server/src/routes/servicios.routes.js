const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { iniciar, finalizar } = require('../controllers/servicios.controller');

// Todas las rutas de servicios exigen token.
router.use(verificarToken);

router.post('/', iniciar);
router.put('/:id_hoja/finalizar', finalizar);

module.exports = router;
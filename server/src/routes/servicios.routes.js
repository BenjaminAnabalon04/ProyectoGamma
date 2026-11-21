const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { iniciar, finalizar, enviar } = require('../controllers/servicios.controller');

// Todas las rutas de servicios exigen token.
router.use(verificarToken);

router.post('/', iniciar);
router.put('/:id_hoja/finalizar', finalizar);
router.post('/:id_hoja/enviar', enviar);

module.exports = router;
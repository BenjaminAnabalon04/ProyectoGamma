// Desarrollado por: Agustín Insunsa

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { iniciar, obtenerHoja, finalizar, enviar } = require('../controllers/servicios.controller');

router.use(verificarToken);

router.post('/', iniciar);
router.get('/:id_hoja', obtenerHoja);
router.put('/:id_hoja/finalizar', finalizar);
router.post('/:id_hoja/enviar', enviar);

module.exports = router;

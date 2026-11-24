// Desarrollado por: Agustín Insunsa

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const { login, perfil } = require('../controllers/auth.controller');

router.post('/login', login);
router.get('/perfil', verificarToken, perfil);

module.exports = router;

const express = require('express');
const { verificarToken } = require('../middleware/auth');
const { misTrabajos } = require('../controllers/ordenes.controller');

const router = express.Router();

// Toda esta rama exige un token válido.
router.use(verificarToken);

router.get('/', misTrabajos);

module.exports = router;

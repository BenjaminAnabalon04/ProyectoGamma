// Desarrollado por: Agustín Insunsa

const express = require('express');
const controller = require('../controllers/health.controller');

const router = express.Router();

router.get('/', controller.estado);
router.get('/db', controller.estadoBaseDeDatos);
router.get('/erp', controller.estadoErp);

module.exports = router;

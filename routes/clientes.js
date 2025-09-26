const express = require('express');
const router = express.Router();
const pool = require('../config/bd');
const { verificarToken, soloAdmin } = require('../middlewares/auth');

// Obtener todos los clientes (solo admin)
router.get('/', verificarToken, soloAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT id, nombre FROM clientes');
  res.json(rows);
});

module.exports = router;
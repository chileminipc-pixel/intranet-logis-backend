const express = require('express');
const router = express.Router();
const pool = require('../config/bd');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET = process.env.SECRET;

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.query(`
    SELECT u.id, u.email, u.password_hash, u.rol, u.cliente_id, c.nombre AS empresa
    FROM usuarios u
    JOIN clientes c ON u.cliente_id = c.id
    WHERE u.email = ?
  `, [email]);

  if (rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

  const payload = {
    id: user.id,
    email: user.email,
    cliente_id: user.cliente_id,
    rol: user.rol,
    empresa: user.empresa
  };

  const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;
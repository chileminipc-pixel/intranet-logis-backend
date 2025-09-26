const express = require('express');
const router = express.Router();
const pool = require('../config/bd');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verificarToken, soloAdmin } = require('../middlewares/auth');
const SECRET = process.env.SECRET;
const { body, validationResult } = require('express-validator');
const { validarUsuario } = require('../middlewares/validacionesUsuarios');
const { exportarDatos, exportarTablaPDF } = require('../utils/exportarDatos');


// crear usuario (solo admin) con validaciones personalizadas
router.post('/', validarUsuario, async (req, res) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const { email, password, cliente_id, rol = 'cliente' } = req.body;

  const [existe] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existe.length > 0) {
    return res.status(409).json({ error: 'El email ya está registrado' });
  }

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    'INSERT INTO usuarios (email, password_hash, cliente_id, rol) VALUES (?, ?, ?, ?)',
    [email, hash, cliente_id, rol]
  );
  res.json({ mensaje: 'Usuario creado' });
});

// // crear usuario (solo admin) con validaciones de express-validator (email, password min 6, cliente_id obligatorio, rol obligatorio y solo admin o cliente)
// router.post(
//   '/',
//   [
//     body('email')
//       .notEmpty().withMessage('El email es obligatorio')
//       .isEmail().withMessage('El formato del email no es válido'),

//     body('password')
//       .notEmpty().withMessage('La contraseña es obligatoria')
//       .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

//     body('cliente_id')
//       .notEmpty().withMessage('El cliente_id es obligatorio'),

//     body('rol')
//       .notEmpty().withMessage('El rol es obligatorio')
//       .isIn(['admin', 'cliente']).withMessage('El rol debe ser "admin" o "cliente"')
//   ],
//   async (req, res) => {
//     const errores = validationResult(req);
//     if (!errores.isEmpty()) {
//       return res.status(400).json({ errores: errores.array() });
//     }

//     const { email, password, cliente_id, rol = 'cliente' } = req.body;
//     const hash = await bcrypt.hash(password, 10);
//     await pool.query(
//       'INSERT INTO usuarios (email, password_hash, cliente_id, rol) VALUES (?, ?, ?, ?)',
//       [email, hash, cliente_id, rol]
//     );
//     res.json({ mensaje: 'Usuario creado' });
//   }
// );

//login de usuario que devuelva un token JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await pool.query(`
    SELECT u.id, u.email, u.password_hash, u.rol, u.cliente_id, c.nombre AS empresa
    FROM usuarios u
    JOIN clientes c ON u.cliente_id = c.id
    WHERE u.email = ?
  `, [email]);

  if (rows.length === 0) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  // ✅ Payload completo con email, rol y empresa
  const payload = {
    id: user.id,
    email: user.email,
    cliente_id: user.cliente_id,
    rol: user.rol,
    empresa: user.empresa
  };

 // const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
  // Generas el token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      rol: user.rol,
      cliente_id: user.cliente_id,
      empresa: user.empresa,
    },
    process.env.SECRET,
    { expiresIn: "1h" }
  );



  res.json({ token });
});

// obtener todos los usuarios (solo admin)
router.get('/', verificarToken, soloAdmin, async (req, res) => {
  const [rows] = await pool.query(`
  SELECT u.id, u.email, u.cliente_id, u.rol, c.nombre AS empresa
  FROM usuarios u
  JOIN clientes c ON u.cliente_id = c.id
`);
  res.json(rows);
});

// actualizar usuario, solo que se pueda cambiar email, cliente_id y rol
router.put('/:id',
  verificarToken,
  soloAdmin,
  [
    body('email')
      .optional()
      .notEmpty().withMessage('El email no puede estar vacío')
      .isEmail().withMessage('El formato del email no es válido'),

    body('cliente_id')
      .optional()
      .notEmpty().withMessage('El cliente_id no puede estar vacío'),

    body('rol')
      .optional()
      .notEmpty().withMessage('El rol no puede estar vacío')
      .isIn(['admin', 'cliente']).withMessage('El rol debe ser "admin" o "cliente"')
  ],
  async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ errores: errores.array() });
    }

    const { email, cliente_id, rol, password } = req.body;
    const campos = [];
    const valores = [];

    if (email) {
      campos.push('email = ?');
      valores.push(email);
    }
    if (cliente_id) {
      campos.push('cliente_id = ?');
      valores.push(cliente_id);
    }
    if (rol) {
      campos.push('rol = ?');
      valores.push(rol);
    }

    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      campos.push('password_hash = ?');
      valores.push(hash);
    }


    if (campos.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    valores.push(req.params.id);
    const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
    await pool.query(sql, valores);
    res.json({ mensaje: 'Usuario actualizado' });
  }
);


//borrar usuario
router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
  await pool.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
  res.json({ mensaje: 'Usuario eliminado' });
});


// buscar usuario por email, cliente_id o rol (cualquiera de los tres, no es obligatorio)
router.get('/buscar', verificarToken, soloAdmin, async (req, res) => {
  const { email, cliente_id, rol } = req.query;

  let sql = 'SELECT u.id, email, u.cliente_id, rol, c.nombre AS empresa FROM usuarios u JOIN clientes c ON u.cliente_id=c.id WHERE 1=1';
  const params = [];

  if (email) {
    sql += ' AND email LIKE ?';
    params.push(`%${email}%`);
  }

  if (cliente_id) {
    sql += ' AND cliente_id = ?';
    params.push(cliente_id);
  }

  if (rol) {
    sql += ' AND rol = ?';
    params.push(rol);
  }
  
  const logQuery = require('../utils/queryLogger');
  
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

//OBTENER USUARIO POR ID (solo admin)
router.get('/:id', verificarToken, soloAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT u.id, u.email, u.cliente_id, u.rol, c.nombre AS empresa FROM usuarios u JOIN clientes c ON u.cliente_id=c.id WHERE u.id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
});

// Exportar usuarios en CSV o PDF
router.get('/exportar/:formato', verificarToken, soloAdmin, async (req, res) => {
  const { formato } = req.params;
  const { email, cliente_id, rol } = req.query;

  let sql = `
    SELECT u.email, u.rol, c.nombre AS empresa
    FROM usuarios u
    JOIN clientes c ON u.cliente_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (email) {
    sql += ' AND u.email LIKE ?';
    params.push(`%${email}%`);
  }

  if (cliente_id) {
    sql += ' AND u.cliente_id = ?';
    params.push(cliente_id);
  }

  if (rol) {
    sql += ' AND u.rol = ?';
    params.push(rol);
  }

  const [rows] = await pool.query(sql, params);
  if (formato === 'csv') {
    exportarDatos(rows, ['email', 'rol', 'empresa'], 'csv', res);
  } else if (formato === 'pdf') {
    exportarTablaPDF(rows, ['email', 'rol', 'empresa'], res, 'Usuarios filtrados');
  } else {
    res.status(400).json({ error: 'Formato no soportado' });
  }
});

module.exports = router;
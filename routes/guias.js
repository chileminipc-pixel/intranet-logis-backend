const express = require('express');
const router = express.Router();
const pool = require('../config/bd');
const { verificarToken } = require('../middlewares/auth');
const { exportarDatos, exportarTablaPDF } = require('../utils/exportarDatos');

// 📤 Endpoint para exportar datos en CSV o PDF con filtros
router.get('/exportar/:formato', verificarToken, async (req, res) => {
  const { formato } = req.params;
  const { estado, fecha_inicio, fecha_fin } = req.query;

  // ✅ Aquí va la constante
  const cliente_id = req.user.cliente_id;


  let sql = `
    SELECT g.guia, fecha, g.sucursal, servicio, frecuencia, patente, total
    FROM guias_residuos g
    WHERE 1=1 `;
  const params = [];

  if (cliente_id) {
    sql += ' AND g.cliente_id = ?';
    params.push(cliente_id);
  }

  if (estado) {
    sql += ' AND g.estado = ?';
    params.push(estado);
  }

  if (fecha_inicio && fecha_fin) {
    sql += ' AND g.fecha BETWEEN ? AND ?';
    params.push(fecha_inicio, fecha_fin);
  }

  console.log('SQL:', sql);
  console.log('Params:', params);

  const [rows] = await pool.query(sql, params);


  if (formato === 'csv') {
    exportarDatos(rows, ['guia', 'fecha','sucursal', 'servicio', 'frecuencia','patente','total'], 'csv', res);
  } else if (formato === 'pdf') {
    exportarTablaPDF(rows, ['guia', 'fecha','sucursal', 'servicio', 'frecuencia','patente','total'], res, 'Guías');
  } else {
    res.status(400).json({ error: 'Formato no soportado' });
  }
});



// 📄 Endpoint principal con paginación y filtros
router.get('/', verificarToken, async (req, res) => {
  const {
    page = 1, limit = 30, sucursal, servicio, frecuencia, guia, patente, desde, hasta } = req.query;

  const offset = (page - 1) * limit;
  const cliente_id = req.user.cliente_id;

  let where = 'WHERE cliente_id = ?';
  const params = [cliente_id];

  if (sucursal) {
    where += ' AND sucursal = ?';
    params.push(sucursal);
  }
  if (servicio) {
    where += ' AND servicio = ?';
    params.push(servicio);
  }
  if (frecuencia) {
    where += ' AND frecuencia = ?';
    params.push(frecuencia);
  }
  if (guia) {
    where += ' AND guia LIKE ?';
    params.push(`%${guia}%`);
  }
  if (patente) {
    where += ' AND patente LIKE ?';
    params.push(`%${patente}%`);
  }
  if (desde && hasta) {
    where += ' AND fecha BETWEEN ? AND ?';
    params.push(desde, hasta);
  }

  const sqlDatos = `
    SELECT id, guia, fecha, sucursal, servicio, frecuencia, lts_limite, lts_retirados, valor_servicio, valor_lt_adic, patente, total
    FROM guias_residuos
    ${where}
    ORDER BY fecha ASC
    LIMIT ? OFFSET ?
  `;

  const sqlTotal = `
    SELECT COUNT(*) AS total_registros
    FROM guias_residuos
    ${where}
  `;

  const [guias] = await pool.query(sqlDatos, [...params, Number(limit), Number(offset)]);
  const [[{ total_registros }]] = await pool.query(sqlTotal, params);

  res.json({
    page: Number(page),
    total: total_registros,
    guias
  });
});

//endpoint para obtener la cantidad total de guias del cliente
router.get('/cantidad', verificarToken, async (req, res) => {
  const [rows] = await pool.query('SELECT COUNT(*)  cantguias FROM guias_residuos WHERE cliente_id = ?', [req.user.cliente_id]);
  res.json(rows);
});

//endpoint para obtener la cantidad de sucursales distintas del cliente
router.get('/cantidadsucursales', verificarToken, async (req, res) => {
  const [rows] = await pool.query('SELECT COUNT(DISTINCT sucursal) cantsucursales FROM guias_residuos WHERE cliente_id = ?', [req.user.cliente_id]);
  res.json(rows);
});

//endpoint para obtener el monto total de guias del cliente
router.get('/montodinero', verificarToken, async (req, res) => {
  const [rows] = await pool.query('SELECT SUM(total) montototalguias FROM guias_residuos WHERE cliente_id = ?', [req.user.cliente_id]);
  res.json(rows);
});

//endpoint para obtener la cantidad de guias filtrada por sucursal y rango de fechas
router.get('/cantidadfiltrada', verificarToken, async (req, res) => {
  const { sucursal, desde, hasta } = req.query;

  let sql = 'SELECT COUNT(*) cantfiltrada FROM guias_residuos WHERE cliente_id = ?';
  const params = [req.user.cliente_id];

  if (sucursal) {
    sql += ' AND sucursal = ?';
    params.push(sucursal);
  }

  if (desde && hasta) {
    sql += ' AND fecha BETWEEN ? AND ?';
    params.push(desde, hasta);
  }

  const [rows] = await pool.query(sql, params);
  res.json(rows[0]);
});

// 📋 Endpoint para obtener opciones únicas para filtros
router.get('/opciones', verificarToken, async (req, res) => {
  const cliente_id = req.user.cliente_id;

  const [sucursales] = await pool.query(
    'SELECT DISTINCT sucursal FROM guias_residuos WHERE cliente_id = ? ORDER BY sucursal',
    [cliente_id]
  );

  const [servicios] = await pool.query(
    'SELECT DISTINCT servicio FROM guias_residuos WHERE cliente_id = ? ORDER BY servicio',
    [cliente_id]
  );

  const [frecuencias] = await pool.query(
    'SELECT DISTINCT frecuencia FROM guias_residuos WHERE cliente_id = ? ORDER BY frecuencia',
    [cliente_id]
  );

  res.json({
    sucursales: sucursales.map(s => s.sucursal),
    servicios: servicios.map(s => s.servicio),
    frecuencias: frecuencias.map(f => f.frecuencia)
  });
});

module.exports = router;
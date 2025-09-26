const express = require('express');
const router = express.Router();
const pool = require('../config/bd');
const { verificarToken } = require('../middlewares/auth');
const { exportarDatos, exportarTablaPDF } = require('../utils/exportarDatos');

// 📄 Endpoint principal con paginación y filtros
router.get('/', verificarToken, async (req, res) => {
  const { page = 1, limit = 30, sucursal, desde, hasta } = req.query;
  const offset = (page - 1) * limit;
  const cliente_id = req.user.cliente_id;

  let where = 'WHERE cliente_id = ?';
  const params = [cliente_id];

  if (sucursal) {
    where += ' AND sucursal = ?';
    params.push(sucursal);
  }

  if (desde && hasta) {
    where += ' AND fecha BETWEEN ? AND ?';
    params.push(desde, hasta);
  }

  const sql = `
    SELECT id, fecha, sucursal, dias_mora, nro_factura, monto_factura, estado_mora, observaciones
    FROM facturas_impagas
    ${where}
    ORDER BY fecha DESC
    LIMIT ? OFFSET ?
  `;

  const [facturas] = await pool.query(sql, [...params, Number(limit), Number(offset)]);
  const [[{ total_registros }]] = await pool.query(
    `SELECT COUNT(*) AS total_registros FROM facturas_impagas ${where}`,
    params
  );

  res.json({ page: Number(page), total: total_registros, facturas });
});

// 📊 Cantidad total de facturas del cliente
router.get('/cantidad', verificarToken, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) cantidad FROM facturas_impagas WHERE cliente_id = ?',
    [req.user.cliente_id]
  );
  res.json(rows);
});

// 💰 Monto total de facturas del cliente
router.get('/monto', verificarToken, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT SUM(monto_factura) montototal FROM facturas_impagas WHERE cliente_id = ?',
    [req.user.cliente_id]
  );
  res.json(rows);
});

// 🏢 Sucursales disponibles para el cliente
router.get('/sucursales', verificarToken, async (req, res) => {
  const cliente_id = req.user.cliente_id;

  const [sucursales] = await pool.query(
    'SELECT DISTINCT sucursal FROM facturas_impagas WHERE cliente_id = ? ORDER BY sucursal',
    [cliente_id]
  );

  res.json(sucursales.map(s => s.sucursal));
});

// 📤 Exportación en CSV o PDF
router.get('/exportar/:formato', verificarToken, async (req, res) => {
  const { formato } = req.params;
  const { sucursal, desde, hasta } = req.query;

  let where = 'WHERE cliente_id = ?';
  const params = [req.user.cliente_id];

  if (sucursal) {
    where += ' AND sucursal = ?';
    params.push(sucursal);
  }

  if (desde && hasta) {
    where += ' AND fecha BETWEEN ? AND ?';
    params.push(desde, hasta);
  }

  const sql = `
    SELECT id, fecha, sucursal, monto_factura
    FROM facturas_impagas
    ${where}
    ORDER BY fecha DESC
  `;

  const [rows] = await pool.query(sql, params);

  const columnas = ['id', 'fecha', 'sucursal', 'monto_factura'];

  if (formato === 'csv') {
    exportarDatos(rows, columnas, 'csv', res);
  } else if (formato === 'pdf') {
    exportarTablaPDF(rows, columnas, res, 'Facturas impagas');
  } else {
    res.status(400).json({ error: 'Formato no soportado' });
  }
});

module.exports = router;
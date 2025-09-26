const express = require('express');
const router = express.Router();
const pool = require('../config/bd');
const { verificarToken } = require('../middlewares/auth');

// Endpoint principal
router.get('/resumen', verificarToken, async (req, res) => {
  const cliente_id = req.user.cliente_id;
  const { desde, hasta } = req.query;

  try {
    // Construir condiciones WHERE para las fechas
    let condicionFechasGuias = 'cliente_id = ?';
    let condicionFechasFacturas = 'cliente_id = ?';
    const parametrosGuias = [cliente_id];
    const parametrosFacturas = [cliente_id];

    // Si vienen fechas, agregar filtro por fecha
    if (desde && hasta) {
      condicionFechasGuias += ' AND fecha BETWEEN ? AND ?';
    //  condicionFechasFacturas += ' AND fecha BETWEEN ? AND ?';
    //  condicionFechasFacturas = " 1= 1 "; // Las facturas no tienen campo fecha, así que no filtramos
      parametrosGuias.push(desde, hasta);
      //parametrosFacturas.push(desde, hasta);
    } else {
      // Por defecto: mes actual
      const fechaActual = new Date();
      const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)
        .toISOString().split('T')[0]; // Formato YYYY-MM-DD
      const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0)
        .toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      condicionFechasGuias += ' AND fecha BETWEEN ? AND ?';
      //condicionFechasFacturas += ' AND fecha BETWEEN ? AND ?';
      //condicionFechasFacturas = " 1= 1 "; // Las facturas no tienen campo fecha, así que no filtramos
      parametrosGuias.push(primerDiaMes, ultimoDiaMes);
      //parametrosFacturas.push(primerDiaMes, ultimoDiaMes);
    }

    const [
      [[guias]],
      [[facturas]],
      [[montoGuias]],
      [[montoFacturas]],
      [[sucursales]],
      [guiasPorSucursal],
      [montoGuiasPorSucursal],
      [facturasPorSucursal],
      [montoFacturasPorSucursal]
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS cantidad_guias FROM guias_residuos WHERE ${condicionFechasGuias}`, parametrosGuias),
        pool.query('SELECT COUNT(*) AS cantidad_facturas FROM facturas_impagas WHERE cliente_id = ?', [cliente_id]),
      //pool.query(`SELECT COUNT(*) AS cantidad_facturas FROM facturas_impagas WHERE ${condicionFechasFacturas}`, parametrosFacturas),
        pool.query(`SELECT SUM(total) AS monto_guias FROM guias_residuos WHERE ${condicionFechasGuias}`, parametrosGuias),
      //pool.query(`SELECT SUM(monto_factura) AS monto_facturas FROM facturas_impagas WHERE ${condicionFechasFacturas}`, parametrosFacturas),
        pool.query('SELECT SUM(monto_factura) AS monto_facturas FROM facturas_impagas WHERE cliente_id = ?', [cliente_id]),
      pool.query(`SELECT COUNT(DISTINCT sucursal) AS cantidad_sucursales FROM guias_residuos WHERE ${condicionFechasGuias}`, parametrosGuias),
      pool.query(`SELECT sucursal, COUNT(*) AS cantidad FROM guias_residuos WHERE ${condicionFechasGuias} GROUP BY sucursal`, parametrosGuias),
      pool.query(`SELECT sucursal, SUM(total) AS monto FROM guias_residuos WHERE ${condicionFechasGuias} GROUP BY sucursal`, parametrosGuias),
      //pool.query(`SELECT sucursal, COUNT(*) AS cantidad FROM facturas_impagas WHERE ${condicionFechasFacturas} GROUP BY sucursal`, parametrosFacturas),
        pool.query('SELECT sucursal, COUNT(*) AS cantidad FROM facturas_impagas WHERE cliente_id = ? GROUP BY sucursal', [cliente_id]),
      //pool.query(`SELECT sucursal, SUM(monto_factura) AS monto FROM facturas_impagas WHERE ${condicionFechasFacturas} GROUP BY sucursal`, parametrosFacturas)
        pool.query('SELECT sucursal, SUM(monto_factura) AS monto FROM facturas_impagas WHERE cliente_id = ? GROUP BY sucursal', [cliente_id])
    ]);

    res.json({
      resumen: {
        cantidad_guias: guias.cantidad_guias || 0,
        cantidad_facturas: facturas.cantidad_facturas || 0,
        monto_guias: montoGuias.monto_guias || 0,
        monto_facturas: montoFacturas.monto_facturas || 0,
        cantidad_sucursales: sucursales.cantidad_sucursales || 0,
        promedio_monto_guias:
          guias.cantidad_guias > 0
            ? (montoGuias.monto_guias || 0) / guias.cantidad_guias
            : 0,
        promedio_monto_facturas:
          facturas.cantidad_facturas > 0
            ? (montoFacturas.monto_facturas || 0) / facturas.cantidad_facturas
            : 0,
      },
      detalle_por_sucursal: {
        guias: guiasPorSucursal,
        monto_guias: montoGuiasPorSucursal,
        facturas: facturasPorSucursal,
        monto_facturas: montoFacturasPorSucursal
      }
    });
  } catch (error) {
    console.error('Error en /dashboard/resumen:', error);
    res.status(500).json({ error: 'Error al obtener el resumen del dashboard' });
  }
});

module.exports = router;
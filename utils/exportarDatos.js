const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const año = fecha.getFullYear();
  return `${dia}-${mes}-${año}`;
}

function exportarDatos(datos, campos, formato, res) {
  // ✅ Formatear fechas antes de exportar
  const datosFormateados = datos.map(row => {
    const nuevo = { ...row };
    campos.forEach(campo => {
      if (campo.toLowerCase().includes('fecha') && nuevo[campo]) {
        nuevo[campo] = formatearFecha(nuevo[campo]);
      }
    });
    return nuevo;
  });

  if (formato === 'csv') {
    const parser = new Parser({ fields: campos });
    const csv = parser.parse(datosFormateados);
    res.header('Content-Type', 'text/csv');
    res.attachment('exportado.csv');
    return res.send(csv);
  }

  if (formato === 'pdf') {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=exportado.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Exportación de datos', { align: 'center' });
    doc.moveDown();

    datosFormateados.forEach(d => {
      campos.forEach(campo => {
        doc.fontSize(12).text(`${campo}: ${d[campo]}`);
      });
      doc.moveDown();
    });

    doc.end();
  }
}

function exportarTablaPDF(datos, columnas, res, titulo = 'Exportación de datos') {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=exportado.pdf');
  doc.pipe(res);

  // ✅ Título
  doc.fontSize(16).text(titulo, { align: 'center' });
  doc.moveDown();

  const colWidths = columnas.map(() => 150);
  const startX = doc.page.margins.left;
  let y = doc.y;

  // ✅ Formatear fechas antes de dibujar
  const datosFormateados = datos.map(row => {
    const nuevo = { ...row };
    columnas.forEach(col => {
      if (col.toLowerCase().includes('fecha') && nuevo[col]) {
        nuevo[col] = formatearFecha(nuevo[col]);
      }
    });
    return nuevo;
  });

  // ✅ Encabezados
  columnas.forEach((col, i) => {
    doc.rect(startX + i * colWidths[i], y, colWidths[i], 20).stroke();
    doc.fontSize(12).text(col, startX + i * colWidths[i] + 5, y + 5);
  });
  y += 20;

  // ✅ Filas
  datosFormateados.forEach(row => {
    columnas.forEach((col, i) => {
      const valor = row[col] ?? '';
      doc.rect(startX + i * colWidths[i], y, colWidths[i], 20).stroke();
      doc.fontSize(10).text(valor.toString(), startX + i * colWidths[i] + 5, y + 5);
    });
    y += 20;
    if (y > doc.page.height - 50) {
      doc.addPage();
      y = doc.y;
    }
  });

  doc.end();
}


module.exports = {
  exportarDatos,
  exportarTablaPDF
};
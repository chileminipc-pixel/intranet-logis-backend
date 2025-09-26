    // Verificar si hay token en localStorage
    const token = localStorage.getItem('token');


    if (!token) {
    alert('⚠️ No hay sesión activa. Redirigiendo al login...');
    window.location.href = '/login.html';
    }

    // ✅ Función para exportar guías en CSV o PDF
    function exportarGuias(formato) {
      const cliente_id = document.getElementById('filtroCliente').value;
      const estado = document.getElementById('filtroEstado').value;
      const fecha_inicio = document.getElementById('filtroInicio').value;
      const fecha_fin = document.getElementById('filtroFin').value;
      const token = localStorage.getItem('token');

      const params = new URLSearchParams();
      if (cliente_id) params.append('cliente_id', cliente_id);
      if (estado) params.append('estado', estado);
      if (fecha_inicio && fecha_fin) {
        params.append('fecha_inicio', fecha_inicio);
        params.append('fecha_fin', fecha_fin);
      }
      params.append('token', token);

      window.open(`/guias/exportar/${formato}?${params.toString()}`, '_blank');
    }
    //Función para decodificar el token JWT Y obtener los datos del usuario
  // ✅ Función para decodificar el token JWT
  function decodificarToken(token) {
    const payloadBase64 = token.split('.')[1];
    const payloadJSON = atob(payloadBase64);
    return JSON.parse(payloadJSON);
  }

  const payload = JSON.parse(atob(token.split('.')[1]));

    // Mostrar el botón solo si el usuario es admin
if (payload.rol === 'admin') {
  const btn = document.getElementById('btnUsuarios');
  btn.style.display = 'inline-block';

  // ✅ Enlace al mantenedor
  btn.addEventListener('click', () => {
    window.location.href = '/usuarios.html';
  });
}


    // ✅ Función para cerrar sesión
  function cerrarSesion() {
    localStorage.removeItem('token');
    window.location.href = '/login.html'; // ajusta según tu ruta
  }


    const datosUsuario = decodificarToken(token);
    document.getElementById('emailUsuario').textContent = datosUsuario.email;
    document.getElementById('rolUsuario').textContent = datosUsuario.rol;
    document.getElementById('empresaUsuario').textContent = datosUsuario.empresa;

  if (datosUsuario.rol === 'admin') {
  document.getElementById('btnUsuarios').style.display = 'inline-block';
}



    // ✅ Función para formatear fechas
    function formatearFecha(fechaISO) {
        const fecha = new Date(fechaISO);
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const año = fecha.getFullYear();
        return `${dia}-${mes}-${año}`;
    }


    // Cargar resumen general y detalle por sucursal
    fetch('http://localhost:3000/dashboard/resumen', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      const resumen = data.resumen || {};
      const detalle = data.detalle_por_sucursal || {};

      const resumenHTML = `
        <div class="card">
          <h2>Resumen General</h2>
          <p>Guías: ${resumen.cantidad_guias}</p>
          <p>Facturas: ${resumen.cantidad_facturas}</p>
          <p>Monto en Guías: $${(resumen.monto_guias || 0).toLocaleString()}</p>
          <p>Monto en Facturas: $${(resumen.monto_facturas || 0).toLocaleString()}</p>
          <p>Sucursales activas: ${resumen.cantidad_sucursales}</p>
        </div>
      `;
      document.getElementById('resumen').innerHTML = resumenHTML;

      const guias = detalle.guias || [];
      const montoGuias = detalle.monto_guias || [];
      const facturas = detalle.facturas || [];
      const montoFacturas = detalle.monto_facturas || [];

      const sucursalesHTML = guias.map(g => {
        const sucursal = g.sucursal ?? 'Sin nombre';
        const cantidadGuias = g.cantidad ?? 0;
        const montoG = montoGuias.find(m => m.sucursal === sucursal)?.monto ?? 0;
        const cantidadFacturas = facturas.find(f => f.sucursal === sucursal)?.cantidad ?? 0;
        const montoF = montoFacturas.find(m => m.sucursal === sucursal)?.monto ?? 0;

        return `
          <div class="card sucursal">
            <h2>Sucursal: ${sucursal}</h2>
            <p>Guías: ${cantidadGuias}</p>
            <p>Monto en Guías: $${montoG.toLocaleString()}</p>
            <p>Facturas: ${cantidadFacturas}</p>
            <p>Monto en Facturas: $${montoF.toLocaleString()}</p>
          </div>
        `;
      }).join('');

      document.getElementById('sucursales').innerHTML = sucursalesHTML;
    });


  function cargarOpciones() {
    fetch('/guias/opciones', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        poblarSelect('filtroServicio', data.servicios);
        poblarSelect('filtroFrecuencia', data.frecuencias);
        poblarSelect('filtroSucursal', data.sucursales);
      });
  }

  function poblarSelect(id, opciones) {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">Todas</option>' +
      opciones.map(op => `<option value="${op}">${op}</option>`).join('');
  }

  window.addEventListener('DOMContentLoaded', () => {
    cargarOpciones();
    cargarGuias();
  });
    // Cargar guías con filtros y paginación
  function cargarGuias(page = 1) {
    const sucursal = document.getElementById('filtroSucursal').value;
    const servicio = document.getElementById('filtroServicio').value;
    const frecuencia = document.getElementById('filtroFrecuencia').value;
    const guia = document.getElementById('filtroGuia').value;
    const patente = document.getElementById('filtroPatente').value;
    const desde = document.getElementById('filtroDesde').value;
    const hasta = document.getElementById('filtroHasta').value;

    const params = new URLSearchParams({
      page,
      sucursal,
      servicio,
      frecuencia,
      guia,
      patente,
      desde,
      hasta
    });

    fetch(`http://localhost:3000/guias?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const tbody = document.querySelector('#tablaGuias tbody');
        tbody.innerHTML = data.guias.map(g =>
          `<tr>
            <td>${formatearFecha(g.fecha)}</td>
            <td>${g.guia}</td>
            <td>${g.sucursal}</td>
            <td>${g.servicio}</td>
            <td>${g.frecuencia}</td>
            <td>${g.lts_limite}</td>
            <td>${g.lts_retirados}</td>
            <td>$${Number(g.valor_servicio).toLocaleString()}</td>
            <td>$${Number(g.valor_lt_adic).toLocaleString()}</td>
            <td>${g.patente}</td>
            <td>$${Number(g.total).toLocaleString()}</td>
          </tr>`
        ).join('');

        const totalPages = Math.ceil(data.total / 10);
        const paginacion = Array.from({ length: totalPages }, (_, i) =>
          `<button onclick="cargarGuias(${i + 1})">${i + 1}</button>`
        ).join('');
        document.getElementById('paginacion').innerHTML = paginacion;
      });
    }

    // Cargar sucursales para el filtro de facturas
    function cargarSucursalesFacturas() {
        fetch('http://localhost:3000/facturas/sucursales', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(sucursales => {
            const select = document.getElementById('filtroSucursalFacturas');
            sucursales.forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = s;
            select.appendChild(option);
            });
        });
    }


    // Cargar facturas con filtros y paginación
    function cargarFacturas(page = 1) {
    const sucursal = document.getElementById('filtroSucursalFacturas').value;
    const desde = document.getElementById('filtroDesdeFacturas').value;
    const hasta = document.getElementById('filtroHastaFacturas').value;


    const params = new URLSearchParams({ page, sucursal, desde, hasta });

    fetch(`http://localhost:3000/facturas?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector('#tablaFacturas tbody');
      tbody.innerHTML = data.facturas.map(f =>
        `<tr>
          <td>${formatearFecha(f.fecha)}</td>
          <td>${f.nro_factura}</td>
          <td>${f.sucursal}</td>
          <td>${f.dias_mora}</td>
          <td>$${Number(f.monto_factura).toLocaleString()}</td>
          <td>${f.estado_mora}</td>
          <td>${f.observaciones || ''}</td>
        </tr>`
      ).join('');


      const totalPages = Math.ceil(data.total / 10);
      const paginacion = Array.from({ length: totalPages }, (_, i) =>
        `<button onclick="cargarFacturas(${i + 1})">${i + 1}</button>`
      ).join('');
      document.getElementById('paginacionFacturas').innerHTML = paginacion;
    });
  }


  // ✅ Función para exportar usuarios en PDF con tabla
    window.exportarPDFConTabla = function () {
        const email = document.getElementById('filtroEmail')?.value || '';
        const cliente_id = document.getElementById('filtroCliente')?.value || '';
        const rol = document.getElementById('filtroRol')?.value || '';
        const token = localStorage.getItem('token');

        const params = new URLSearchParams();
        if (email.trim()) params.append('email', email);
        if (cliente_id) params.append('cliente_id', cliente_id);
        if (rol) params.append('rol', rol);
        params.append('token', token);

        window.open(`/usuarios/exportar/pdf?${params.toString()}`, '_blank');
    };

    // ✅ Función para exportar facturas en PDF
    window.exportarFacturasImpagasPDF = function () {
    const sucursal = document.getElementById('filtroSucursalFacturas')?.value || '';
    const desde = document.getElementById('filtroDesdeFacturas')?.value || '';
    const hasta = document.getElementById('filtroHastaFacturas')?.value || '';
    const token = localStorage.getItem('token');

    const params = new URLSearchParams();
    if (sucursal) params.append('sucursal', sucursal);
    if (desde && hasta) {
        params.append('desde', desde);
        params.append('hasta', hasta);
    }
    params.append('estado', 'impaga');
    params.append('token', token);

    window.open(`/facturas/exportar/pdf?${params.toString()}`, '_blank');
    };

    // ✅ Función para exportar facturas en CSV
    window.exportarFacturasImpagasCSV = function () {
    const sucursal = document.getElementById('filtroSucursalFacturas')?.value || '';
    const desde = document.getElementById('filtroDesdeFacturas')?.value || '';
    const hasta = document.getElementById('filtroHastaFacturas')?.value || '';
    const token = localStorage.getItem('token');

    const params = new URLSearchParams();
    if (sucursal) params.append('sucursal', sucursal);
    if (desde && hasta) {
        params.append('desde', desde);
        params.append('hasta', hasta);
    }
    params.append('token', token);
    window.open(`/facturas/exportar/csv?${params.toString()}`, '_blank');
    };

    // ✅ Función para exportar guías en CSV o PDF
    window.exportarGuias = function (formato) {
    const sucursal = document.getElementById('filtroSucursal')?.value || '';
    const desde = document.getElementById('filtroDesde')?.value || '';
    const hasta = document.getElementById('filtroHasta')?.value || '';
    const token = localStorage.getItem('token');

    const params = new URLSearchParams();
    if (sucursal) params.append('sucursal', sucursal);
    if (desde && hasta) {
        params.append('desde', desde);
        params.append('hasta', hasta);
    }
    params.append('token', token);
    window.open(`/guias/exportar/${formato}?${params.toString()}`, '_blank');
    };
    // Inicializar
    cargarSucursalesFacturas(); 
  //  cargarSucursales(); 
    cargarGuias();   
    cargarFacturas();
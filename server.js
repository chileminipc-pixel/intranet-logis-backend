require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// 🛡️ CORS: TEMPORAL - Permitir todos los orígenes para testing
app.use(cors({
  origin: true,  // ✅ Permitir TODOS los orígenes
  credentials: true
}));


// // 🛡️ CORS: Configuración para desarrollo y producción
// const corsOptions = {
//   origin: function (origin, callback) {
//     // Lista de dominios permitidos
//     const allowedOrigins = [
//       'http://localhost:5173', // Desarrollo
//       'http://localhost:3000', // Desarrollo alternativo
//       'https://tu-frontend.vercel.app' // Tu frontend en producción - ACTUALIZA ESTO
//     ];
    
//     // Permitir requests sin origin (como Postman o mobile apps)
//     if (!origin) return callback(null, true);
    
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('No permitido por CORS'));
//     }
//   },
//   credentials: true
// };

//app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' })); // Límite para subida de archivos
app.use(express.urlencoded({ extended: true }));

// ✅ Ruta de salud para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'API de Logis funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: '¡Bienvenido a la API de Logis!',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    // docs: '/api-docs' // Si tienes documentación
  });
});

// ✅ Conectar rutas
const rutasGuias = require('./routes/guias');
const rutasFacturas = require('./routes/facturas');
const rutasUsuarios = require('./routes/usuarios');
const rutasDashboard = require('./routes/dashboard');
const rutasAuth = require('./routes/auth');
const rutasClientes = require('./routes/clientes');

app.use('/clientes', rutasClientes);
app.use('/guias', rutasGuias);
app.use('/facturas', rutasFacturas);
app.use('/usuarios', rutasUsuarios);
app.use('/dashboard', rutasDashboard);
app.use(rutasAuth);

// ✅ Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  if (err.message === 'No permitido por CORS') {
    return res.status(403).json({ 
      error: 'Origen no permitido',
      allowedOrigins: [
        'http://localhost:5173',
        'https://tu-frontend.vercel.app',
        ''
      ]
    });
  }
  
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'production' ? 'Algo salió mal' : err.message
  });
});

// ✅ Servir archivos estáticos desde /public
app.use(express.static('public'));

// ✅ Ruta 404 para endpoints no encontrados
// ✅ Ruta 404 para endpoints no encontrados - CORREGIDO
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    availableEndpoints: [
      '/clientes',
      '/guias', 
      '/facturas',
      '/usuarios',
      '/dashboard',
      '/login'
    ]
  });
});

// ✅ Configuración del puerto para producción
const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
  console.log('🚀 Servidor de Logis iniciado:');
  console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: http://${HOST}:${PORT}`);
  console.log(`✅ Health check: http://${HOST}:${PORT}/health`);
  console.log(`🛡️ CORS permitido para:`);
  console.log('   - http://localhost:5173');
  console.log('   - https://tu-frontend.vercel.app');
});
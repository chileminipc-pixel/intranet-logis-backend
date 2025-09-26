const jwt = require('jsonwebtoken');
const SECRET = process.env.SECRET;

// function verificarToken(req, res, next) {
//   const auth = req.headers.authorization;
//   if (!auth) return res.status(401).json({ error: 'Token requerido' });
//   try {
//     const token = auth.split(' ')[1];
//     req.user = jwt.verify(token, SECRET);
//     next();
//   } catch {
//     res.status(401).json({ error: 'Token inválido' });
//   }
// }

function verificarToken(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.split(' ')[1] || req.query.token;

  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function soloAdmin(req, res, next) {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  next();
}

module.exports = {
  verificarToken,
  soloAdmin
};
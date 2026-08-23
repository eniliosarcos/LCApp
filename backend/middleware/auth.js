const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = { username: payload.username };
    next();
  } catch (err) {
    logger.warn({ err, route: req.originalUrl }, 'Invalid/expired token');
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

// Variante opcional: si hay token válido lo usa, si no continúa como público.
function authenticateOptional(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = { username: payload.username };
    } catch {
      // Token inválido o expirado: se ignora y el request sigue como público.
    }
  }
  next();
}

module.exports = authenticate;
module.exports.authenticateOptional = authenticateOptional;

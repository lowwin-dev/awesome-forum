const jwt = require('jsonwebtoken');
const JWT_SECRET = 'supersecretkey';

function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;

/**
 * Reads the "Authorization: Bearer <token>" header, verifies the JWT,
 * and attaches { id, username } to req.user.
 * Any route wrapped with this can assume a logged-in player.
 */
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Sign in to continue.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired. Sign in again.' });
  }
}

module.exports = requireAuth;

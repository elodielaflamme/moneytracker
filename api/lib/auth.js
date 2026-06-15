const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'sales_tracker_secret_2024';

module.exports = function getUser(req, res) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) { res.status(401).json({ message: 'Non autorisé' }); return null; }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    res.status(401).json({ message: 'Token invalide' });
    return null;
  }
};

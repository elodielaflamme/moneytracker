const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const setCors = require('../lib/cors');
const { query } = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'sales_tracker_secret_2024';

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Tous les champs sont requis.' });

  const result = await query('SELECT * FROM users WHERE username = $1', [username]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ message: 'Identifiants incorrects.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Identifiants incorrects.' });

  const token = jwt.sign(
    { id: user.id, username: user.username, prenom: user.prenom },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, username: user.username, prenom: user.prenom } });
};

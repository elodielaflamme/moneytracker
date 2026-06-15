const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const setCors = require('../lib/cors');
const { query } = require('../lib/db');

const JWT_SECRET = process.env.JWT_SECRET || 'sales_tracker_secret_2024';

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password, prenom } = req.body;
  if (!username || !password || !prenom)
    return res.status(400).json({ message: 'Tous les champs sont requis.' });

  const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length) return res.status(409).json({ message: "Nom d'utilisateur déjà pris." });

  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (username, password, prenom) VALUES ($1, $2, $3) RETURNING id',
    [username, hash, prenom]
  );
  const id = result.rows[0].id;
  const token = jwt.sign({ id, username, prenom }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, username, prenom } });
};

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sales_tracker_secret_2024';

router.post('/register', async (req, res) => {
  const { username, password, prenom } = req.body;
  if (!username || !password || !prenom)
    return res.status(400).json({ message: 'Tous les champs sont requis.' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ message: "Nom d'utilisateur déjà pris." });

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, prenom) VALUES (?, ?, ?)').run(username, hash, prenom);
  const token = jwt.sign({ id: result.lastInsertRowid, username, prenom }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: result.lastInsertRowid, username, prenom } });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Tous les champs sont requis.' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ message: 'Identifiants incorrects.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Identifiants incorrects.' });

  const token = jwt.sign({ id: user.id, username: user.username, prenom: user.prenom }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, prenom: user.prenom } });
});

module.exports = router;

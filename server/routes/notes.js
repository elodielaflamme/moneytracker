const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE user_id = ?').get(req.user.id);
  res.json(note || { contenu: '' });
});

router.put('/', (req, res) => {
  const { contenu } = req.body;
  const existing = db.prepare('SELECT id FROM notes WHERE user_id = ?').get(req.user.id);
  if (existing) {
    db.prepare('UPDATE notes SET contenu=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?').run(contenu, req.user.id);
  } else {
    db.prepare('INSERT INTO notes (user_id, contenu) VALUES (?, ?)').run(req.user.id, contenu);
  }
  res.json({ success: true });
});

module.exports = router;

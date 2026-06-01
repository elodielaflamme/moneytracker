const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// Vérifie que le lead appartient à l'utilisateur
function ownedLead(leadId, userId) {
  return db.prepare('SELECT id FROM leads WHERE id = ? AND user_id = ?').get(leadId, userId);
}

router.get('/:leadId', (req, res) => {
  if (!ownedLead(req.params.leadId, req.user.id))
    return res.status(404).json({ message: 'Lead introuvable.' });
  const suivis = db.prepare(
    'SELECT * FROM suivis WHERE lead_id = ? ORDER BY date_suivi DESC, created_at DESC'
  ).all(req.params.leadId);
  res.json(suivis);
});

router.post('/:leadId', (req, res) => {
  if (!ownedLead(req.params.leadId, req.user.id))
    return res.status(404).json({ message: 'Lead introuvable.' });
  const { date_suivi, description } = req.body;
  if (!date_suivi || !description)
    return res.status(400).json({ message: 'Date et description requises.' });
  const result = db.prepare(
    'INSERT INTO suivis (lead_id, user_id, date_suivi, description) VALUES (?, ?, ?, ?)'
  ).run(req.params.leadId, req.user.id, date_suivi, description);
  res.json(db.prepare('SELECT * FROM suivis WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id/toggle', (req, res) => {
  const suivi = db.prepare('SELECT * FROM suivis WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!suivi) return res.status(404).json({ message: 'Suivi introuvable.' });
  const newVal = suivi.effectue ? 0 : 1;
  db.prepare('UPDATE suivis SET effectue = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ ...suivi, effectue: newVal });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM suivis WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ message: 'Suivi introuvable.' });
  res.json({ success: true });
});

module.exports = router;

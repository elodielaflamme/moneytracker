const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  const clients = db.prepare(`
    SELECT c.*,
      COALESCE((SELECT SUM(montant) FROM achats WHERE client_id = c.id), 0) as total_achats,
      (SELECT COUNT(*) FROM achats WHERE client_id = c.id) as nb_achats
    FROM clients c WHERE c.user_id = ? ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json(clients);
});

router.post('/', (req, res) => {
  const { nom, contact, notes, date_premier_contact, offre_interet } = req.body;
  if (!nom) return res.status(400).json({ message: 'Le nom est requis.' });
  const result = db.prepare(
    'INSERT INTO clients (user_id, nom, contact, notes, date_premier_contact, offre_interet) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, nom, contact || '', notes || '', date_premier_contact || null, offre_interet || '');
  const c = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...c, total_achats: 0, nb_achats: 0 });
});

router.put('/:id', (req, res) => {
  const { nom, contact, notes, date_premier_contact, offre_interet } = req.body;
  const c = db.prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!c) return res.status(404).json({ message: 'Client introuvable.' });
  db.prepare('UPDATE clients SET nom=?, contact=?, notes=?, date_premier_contact=?, offre_interet=? WHERE id=? AND user_id=?')
    .run(nom ?? c.nom, contact ?? c.contact, notes ?? c.notes, date_premier_contact !== undefined ? date_premier_contact : c.date_premier_contact, offre_interet !== undefined ? offre_interet : (c.offre_interet || ''), req.params.id, req.user.id);
  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  const stats = db.prepare('SELECT COALESCE(SUM(montant),0) as total_achats, COUNT(*) as nb_achats FROM achats WHERE client_id=?').get(req.params.id);
  res.json({ ...updated, ...stats });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM clients WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ message: 'Client introuvable.' });
  res.json({ success: true });
});

module.exports = router;

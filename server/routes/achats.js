const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

function ownedLead(id, uid) { return db.prepare('SELECT id FROM leads WHERE id=? AND user_id=?').get(id, uid); }
function ownedClient(id, uid) { return db.prepare('SELECT id FROM clients WHERE id=? AND user_id=?').get(id, uid); }

router.get('/lead/:leadId', (req, res) => {
  if (!ownedLead(req.params.leadId, req.user.id)) return res.status(404).json({ message: 'Lead introuvable.' });
  res.json(db.prepare('SELECT * FROM achats WHERE lead_id=? ORDER BY date_achat DESC').all(req.params.leadId));
});

router.get('/client/:clientId', (req, res) => {
  if (!ownedClient(req.params.clientId, req.user.id)) return res.status(404).json({ message: 'Client introuvable.' });
  res.json(db.prepare('SELECT * FROM achats WHERE client_id=? ORDER BY date_achat DESC').all(req.params.clientId));
});

router.post('/lead/:leadId', (req, res) => {
  if (!ownedLead(req.params.leadId, req.user.id)) return res.status(404).json({ message: 'Lead introuvable.' });
  const { date_achat, produit, montant } = req.body;
  if (!date_achat || !produit || !montant) return res.status(400).json({ message: 'Date, produit et montant requis.' });
  const r = db.prepare('INSERT INTO achats (lead_id, user_id, date_achat, produit, montant) VALUES (?,?,?,?,?)').run(req.params.leadId, req.user.id, date_achat, produit, montant);
  res.json(db.prepare('SELECT * FROM achats WHERE id=?').get(r.lastInsertRowid));
});

router.post('/client/:clientId', (req, res) => {
  if (!ownedClient(req.params.clientId, req.user.id)) return res.status(404).json({ message: 'Client introuvable.' });
  const { date_achat, produit, montant } = req.body;
  if (!date_achat || !produit || !montant) return res.status(400).json({ message: 'Date, produit et montant requis.' });
  const r = db.prepare('INSERT INTO achats (client_id, user_id, date_achat, produit, montant) VALUES (?,?,?,?,?)').run(req.params.clientId, req.user.id, date_achat, produit, montant);
  res.json(db.prepare('SELECT * FROM achats WHERE id=?').get(r.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM achats WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ message: 'Achat introuvable.' });
  res.json({ success: true });
});

module.exports = router;

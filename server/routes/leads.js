const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.get('/', (req, res) => {
  const leads = db.prepare(`
    SELECT l.*,
      COALESCE((SELECT SUM(montant) FROM achats WHERE lead_id = l.id), 0) as total_achats,
      (SELECT COUNT(*) FROM achats WHERE lead_id = l.id) as nb_achats
    FROM leads l WHERE l.user_id = ? ORDER BY l.updated_at DESC
  `).all(req.user.id);
  res.json(leads);
});

router.post('/', (req, res) => {
  const { nom, contact, statut, notes, date_premier_contact, offre_interet, decouverte } = req.body;
  if (!nom) return res.status(400).json({ message: 'Le nom est requis.' });
  const result = db.prepare(
    'INSERT INTO leads (user_id, nom, contact, statut, notes, date_premier_contact, offre_interet, decouverte) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, nom, contact || '', statut || 'Cold', notes || '', date_premier_contact || null, offre_interet || '', decouverte || '');
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
  res.json({ ...lead, total_achats: 0, nb_achats: 0 });
});

router.put('/:id', (req, res) => {
  const { nom, contact, statut, notes, date_premier_contact, offre_interet, decouverte } = req.body;
  const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!lead) return res.status(404).json({ message: 'Lead introuvable.' });

  // Auto-convert to client when status changes to Purchased
  if (statut === 'Purchased' && lead.statut !== 'Purchased') {
    try {
      const finalNom = nom ?? lead.nom;
      const finalContact = contact ?? lead.contact;
      const finalNotes = notes ?? lead.notes;
      const finalDate = date_premier_contact !== undefined ? date_premier_contact : lead.date_premier_contact;
      const finalOffre = offre_interet !== undefined ? offre_interet : (lead.offre_interet || '');

      // Ensure offre_interet column exists (idempotent)
      try { db.exec(`ALTER TABLE clients ADD COLUMN offre_interet TEXT DEFAULT ''`); } catch {}

      const clientResult = db.prepare(
        'INSERT INTO clients (user_id, nom, contact, notes, date_premier_contact, offre_interet) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(req.user.id, finalNom, finalContact || '', finalNotes || '', finalDate || null, finalOffre);

      const clientId = clientResult.lastInsertRowid;
      db.prepare('UPDATE achats SET client_id = ?, lead_id = NULL WHERE lead_id = ?').run(clientId, req.params.id);
      db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);

      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
      const stats = db.prepare('SELECT COALESCE(SUM(montant),0) as total_achats, COUNT(*) as nb_achats FROM achats WHERE client_id=?').get(clientId);
      return res.json({ converted: true, client: { ...client, ...stats } });
    } catch (err) {
      console.error('Erreur conversion lead → client:', err.message);
      return res.status(500).json({ message: `Erreur lors de la conversion : ${err.message}` });
    }
  }

  db.prepare(
    'UPDATE leads SET nom=?, contact=?, statut=?, notes=?, date_premier_contact=?, offre_interet=?, decouverte=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?'
  ).run(nom ?? lead.nom, contact ?? lead.contact, statut ?? lead.statut, notes ?? lead.notes, date_premier_contact !== undefined ? date_premier_contact : lead.date_premier_contact, offre_interet !== undefined ? offre_interet : (lead.offre_interet || ''), decouverte !== undefined ? decouverte : (lead.decouverte || ''), req.params.id, req.user.id);
  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  const stats = db.prepare('SELECT COALESCE(SUM(montant),0) as total_achats, COUNT(*) as nb_achats FROM achats WHERE lead_id=?').get(req.params.id);
  res.json({ ...updated, ...stats });
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ message: 'Lead introuvable.' });
  res.json({ success: true });
});

module.exports = router;

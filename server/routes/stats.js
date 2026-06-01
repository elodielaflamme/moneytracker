const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

const TAUX = { CAD: 1, USD: 1.36, EUR: 1.48 };
const toCAD = (montant, devise) => montant * (TAUX[devise] || 1);

router.get('/annuelles', (req, res) => {
  const uid = req.user.id;
  const annee = parseInt(req.query.annee) || new Date().getFullYear();

  const mois = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const prefix = `${annee}-${m}`;

    // Leads collectés ce mois
    const leads_collectes = db.prepare(
      `SELECT COUNT(*) as n FROM leads WHERE user_id=? AND strftime('%Y-%m', created_at) = ?`
    ).get(uid, prefix).n;

    // Leads convertis (statut Purchased ce mois ou mis à jour ce mois)
    const leads_convertis = db.prepare(
      `SELECT COUNT(*) as n FROM leads WHERE user_id=? AND statut='Purchased' AND strftime('%Y-%m', updated_at) = ?`
    ).get(uid, prefix).n;

    // Ventes du mois (toutes devises converties en CAD)
    const ventesRaw = db.prepare(
      `SELECT montant, devise FROM ventes WHERE user_id=? AND strftime('%Y-%m', date_vente) = ?`
    ).all(uid, prefix);
    const montant_total = ventesRaw.reduce((s, v) => s + toCAD(v.montant, v.devise || 'CAD'), 0);

    return { mois: i + 1, leads_collectes, leads_convertis, montant_total };
  });

  res.json({ annee, mois });
});

module.exports = router;

const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

const TAUX = { CAD: 1, USD: 1.36, EUR: 1.48 };
const toCAD = (montant, devise) => montant * (TAUX[devise] || 1);

function autoStatut(plan) {
  return plan === 'PIF' ? '✓ Paiement complété' : '⏳ Plan de paiement en cours';
}

function nbMoisFromPlan(plan) {
  const m = (plan || '').match(/(\d+)/);
  return m ? parseInt(m[1]) : 1;
}

router.get('/', (req, res) => {
  const ventes = db.prepare('SELECT * FROM ventes WHERE user_id = ? ORDER BY date_vente DESC').all(req.user.id);
  res.json(ventes);
});

router.get('/stats', (req, res) => {
  const uid = req.user.id;
  const rows = db.prepare('SELECT montant, montant_mensuel, devise, date_vente, plan_paiement FROM ventes WHERE user_id = ?').all(uid);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const yearStr = String(now.getFullYear());
  const monthStr = now.toISOString().slice(0, 7);

  let today = 0, week = 0, month = 0, pif = 0, pif_mois = 0;
  const graphMapSales = {};  // toutes ventes (total contracté)
  const graphMapCash = {};   // cash réellement reçu (PIF + 1er versement plan)
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    graphMapSales[k] = 0;
    graphMapCash[k] = 0;
  }

  const mensuelTotal = Array(12).fill(0);
  const mensuelPif = Array(12).fill(0);

  for (const v of rows) {
    const cad = toCAD(v.montant, v.devise || 'CAD');
    const dateStr = (v.date_vente || '').slice(0, 10);
    const isPif = (v.plan_paiement || 'PIF') === 'PIF';
    // Cash received = full amount for PIF, or 1st monthly payment for plans
    const cashCad = isPif ? cad : toCAD(v.montant_mensuel || 0, v.devise || 'CAD');

    if (dateStr === todayStr) today += cad;
    if (new Date(dateStr) >= startOfWeek) week += cad;
    if (dateStr.startsWith(monthStr)) month += cad;
    if (isPif) pif += cad;
    if (isPif && dateStr.startsWith(monthStr)) pif_mois += cad;

    if (graphMapSales[dateStr] !== undefined) graphMapSales[dateStr] += cad;
    if (graphMapCash[dateStr] !== undefined) graphMapCash[dateStr] += cashCad;

    if (dateStr.startsWith(yearStr)) {
      const mIdx = parseInt(dateStr.slice(5, 7), 10) - 1;
      mensuelTotal[mIdx] += cad;
      if (isPif) mensuelPif[mIdx] += cad;
    }
  }

  const graph = Object.keys(graphMapSales).map(jour => ({
    jour,
    total: graphMapSales[jour],
    cash: graphMapCash[jour],
  }));
  const clients_fermes = db.prepare(
    `SELECT COUNT(DISTINCT nom_client) as total FROM ventes WHERE user_id = ? AND nom_client != ''`
  ).get(uid);

  res.json({ today, week, month, pif, pif_mois, clients_fermes: clients_fermes.total, graph, mensuelTotal, mensuelPif });
});

router.post('/', (req, res) => {
  const { montant, montant_mensuel, plan_paiement, devise, nom_client, nom_offre, date_vente } = req.body;
  const plan = plan_paiement || 'PIF';
  const deviseVal = devise || 'CAD';
  const description = `${nom_client || ''} – ${nom_offre || ''}`;

  if (plan !== 'PIF') {
    const nbMois = nbMoisFromPlan(plan);
    const mensuel = parseFloat(montant_mensuel);
    if (!mensuel) return res.status(400).json({ message: 'Montant mensuel requis.' });

    const baseDate = date_vente ? new Date(date_vente) : new Date();
    const entries = [];

    for (let i = 0; i < nbMois; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      const statut = `Plan ${nbMois} mois — ${i + 1}/${nbMois}`;
      const result = db.prepare(
        `INSERT INTO ventes (user_id, montant, montant_mensuel, type_paiement, plan_paiement, devise, nom_client, nom_offre, description, statut, date_vente)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(req.user.id, mensuel, null, 'PIF', 'PIF', deviseVal, nom_client || '', nom_offre || '', description, statut, d.toISOString());
      entries.push(db.prepare('SELECT * FROM ventes WHERE id = ?').get(result.lastInsertRowid));
    }
    return res.json({ plan: true, entries, count: nbMois });
  }

  const totalMontant = parseFloat(montant) || 0;
  if (!totalMontant) return res.status(400).json({ message: 'Montant requis.' });

  const result = db.prepare(
    `INSERT INTO ventes (user_id, montant, montant_mensuel, type_paiement, plan_paiement, devise, nom_client, nom_offre, description, statut, date_vente)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.user.id, totalMontant, null, 'PIF', 'PIF', deviseVal, nom_client || '', nom_offre || '', description, '✓ Paiement complété', date_vente || new Date().toISOString());
  res.json(db.prepare('SELECT * FROM ventes WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { montant, montant_mensuel, plan_paiement, devise, nom_client, nom_offre, date_vente } = req.body;
  const v = db.prepare('SELECT * FROM ventes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!v) return res.status(404).json({ message: 'Vente introuvable.' });

  const plan = plan_paiement ?? v.plan_paiement ?? 'PIF';
  let totalMontant = parseFloat(montant ?? v.montant) || 0;
  let mensuel = v.montant_mensuel;

  if (plan !== 'PIF' && montant_mensuel !== undefined) {
    mensuel = parseFloat(montant_mensuel) || null;
    if (mensuel) totalMontant = mensuel * nbMoisFromPlan(plan);
  } else if (plan === 'PIF') {
    mensuel = null;
    if (montant !== undefined) totalMontant = parseFloat(montant);
  }

  const statut = autoStatut(plan);
  db.prepare(
    `UPDATE ventes SET montant=?, montant_mensuel=?, type_paiement=?, plan_paiement=?, devise=?,
     nom_client=?, nom_offre=?, description=?, statut=?, date_vente=?
     WHERE id=? AND user_id=?`
  ).run(
    totalMontant, mensuel, plan, plan,
    devise ?? v.devise ?? 'CAD',
    nom_client ?? v.nom_client ?? '',
    nom_offre ?? v.nom_offre ?? '',
    `${nom_client ?? v.nom_client ?? ''} – ${nom_offre ?? v.nom_offre ?? ''}`,
    statut, date_vente ?? v.date_vente,
    req.params.id, req.user.id
  );
  res.json(db.prepare('SELECT * FROM ventes WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM ventes WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ message: 'Vente introuvable.' });
  res.json({ success: true });
});

module.exports = router;

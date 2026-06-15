const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

const TAUX = { CAD: 1, USD: 1.36, EUR: 1.48 };
const toCAD = (montant, devise) => montant * (TAUX[devise] || 1);

function toDateStr(val) {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;
  if (req.method !== 'GET') return res.status(405).end();

  const uid = user.id;
  const rows = (await query(
    'SELECT montant, montant_mensuel, devise, date_vente, plan_paiement FROM ventes WHERE user_id = $1',
    [uid]
  )).rows;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const yearStr = String(now.getFullYear());
  const monthStr = now.toISOString().slice(0, 7);

  let today = 0, week = 0, month = 0, pif = 0, pif_mois = 0;
  const graphMapSales = {};
  const graphMapCash = {};
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
    const dateStr = toDateStr(v.date_vente);
    const isPif = (v.plan_paiement || 'PIF') === 'PIF';
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
      if (mIdx >= 0 && mIdx < 12) {
        mensuelTotal[mIdx] += cad;
        if (isPif) mensuelPif[mIdx] += cad;
      }
    }
  }

  const graph = Object.keys(graphMapSales).map(jour => ({
    jour,
    total: graphMapSales[jour],
    cash: graphMapCash[jour],
  }));

  const clientsRes = await query(
    `SELECT COUNT(DISTINCT nom_client) as total FROM ventes WHERE user_id = $1 AND nom_client != ''`,
    [uid]
  );

  res.json({
    today, week, month, pif, pif_mois,
    clients_fermes: parseInt(clientsRes.rows[0].total),
    graph, mensuelTotal, mensuelPif,
  });
};

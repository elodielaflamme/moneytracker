const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

const TAUX = { CAD: 1, USD: 1.36, EUR: 1.48 };
const toCAD = (montant, devise) => montant * (TAUX[devise] || 1);

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;
  if (req.method !== 'GET') return res.status(405).end();

  const uid = user.id;
  const annee = parseInt(req.query.annee) || new Date().getFullYear();

  const mois = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      const prefix = `${annee}-${m}`;

      const leadsCollectesRes = await query(
        `SELECT COUNT(*) as n FROM leads WHERE user_id=$1 AND TO_CHAR(created_at, 'YYYY-MM') = $2`,
        [uid, prefix]
      );

      const leadsConvertisRes = await query(
        `SELECT COUNT(*) as n FROM leads WHERE user_id=$1 AND statut='Purchased' AND TO_CHAR(updated_at, 'YYYY-MM') = $2`,
        [uid, prefix]
      );

      const ventesRes = await query(
        `SELECT montant, devise FROM ventes WHERE user_id=$1 AND TO_CHAR(date_vente, 'YYYY-MM') = $2`,
        [uid, prefix]
      );
      const montant_total = ventesRes.rows.reduce((s, v) => s + toCAD(v.montant, v.devise || 'CAD'), 0);

      return {
        mois: i + 1,
        leads_collectes: parseInt(leadsCollectesRes.rows[0].n),
        leads_convertis: parseInt(leadsConvertisRes.rows[0].n),
        montant_total,
      };
    })
  );

  res.json({ annee, mois });
};

const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

function nbMoisFromPlan(plan) {
  const m = (plan || '').match(/(\d+)/);
  return m ? parseInt(m[1]) : 1;
}

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const result = await query('SELECT * FROM ventes WHERE user_id = $1 ORDER BY date_vente DESC', [user.id]);
    return res.json(result.rows);
  }

  if (req.method === 'POST') {
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
        const r = await query(
          `INSERT INTO ventes (user_id, montant, montant_mensuel, type_paiement, plan_paiement, devise, nom_client, nom_offre, description, statut, date_vente)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
          [user.id, mensuel, null, 'PIF', 'PIF', deviseVal, nom_client || '', nom_offre || '', description, statut, d.toISOString()]
        );
        entries.push(r.rows[0]);
      }
      return res.json({ plan: true, entries, count: nbMois });
    }

    const totalMontant = parseFloat(montant) || 0;
    if (!totalMontant) return res.status(400).json({ message: 'Montant requis.' });

    const result = await query(
      `INSERT INTO ventes (user_id, montant, montant_mensuel, type_paiement, plan_paiement, devise, nom_client, nom_offre, description, statut, date_vente)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [user.id, totalMontant, null, 'PIF', 'PIF', deviseVal, nom_client || '', nom_offre || '', description, '✓ Paiement complété', date_vente || new Date().toISOString()]
    );
    return res.json(result.rows[0]);
  }

  res.status(405).end();
};

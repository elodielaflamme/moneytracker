const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

function nbMoisFromPlan(plan) {
  const m = (plan || '').match(/(\d+)/);
  return m ? parseInt(m[1]) : 1;
}

function autoStatut(plan) {
  return plan === 'PIF' ? '✓ Paiement complété' : '⏳ Plan de paiement en cours';
}

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { montant, montant_mensuel, plan_paiement, devise, nom_client, nom_offre, date_vente } = req.body;
    const vRes = await query('SELECT * FROM ventes WHERE id = $1 AND user_id = $2', [id, user.id]);
    const v = vRes.rows[0];
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
    const nomClient = nom_client ?? v.nom_client ?? '';
    const nomOffre = nom_offre ?? v.nom_offre ?? '';

    await query(
      `UPDATE ventes SET montant=$1, montant_mensuel=$2, type_paiement=$3, plan_paiement=$4, devise=$5,
       nom_client=$6, nom_offre=$7, description=$8, statut=$9, date_vente=$10
       WHERE id=$11 AND user_id=$12`,
      [
        totalMontant, mensuel, plan, plan,
        devise ?? v.devise ?? 'CAD',
        nomClient, nomOffre,
        `${nomClient} – ${nomOffre}`,
        statut, date_vente ?? v.date_vente,
        id, user.id,
      ]
    );
    const updated = await query('SELECT * FROM ventes WHERE id = $1', [id]);
    return res.json(updated.rows[0]);
  }

  if (req.method === 'DELETE') {
    const result = await query('DELETE FROM ventes WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Vente introuvable.' });
    return res.json({ success: true });
  }

  res.status(405).end();
};

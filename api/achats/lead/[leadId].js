const setCors = require('../../lib/cors');
const getUser = require('../../lib/auth');
const { query } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  const { leadId } = req.query;
  const leadRes = await query('SELECT id FROM leads WHERE id = $1 AND user_id = $2', [leadId, user.id]);
  if (!leadRes.rows.length) return res.status(404).json({ message: 'Lead introuvable.' });

  if (req.method === 'GET') {
    const result = await query('SELECT * FROM achats WHERE lead_id = $1 ORDER BY date_achat DESC', [leadId]);
    return res.json(result.rows);
  }

  if (req.method === 'POST') {
    const { date_achat, produit, montant } = req.body;
    if (!date_achat || !produit || !montant)
      return res.status(400).json({ message: 'Date, produit et montant requis.' });
    const result = await query(
      'INSERT INTO achats (lead_id, user_id, date_achat, produit, montant) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [leadId, user.id, date_achat, produit, montant]
    );
    return res.json(result.rows[0]);
  }

  res.status(405).end();
};

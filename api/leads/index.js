const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const result = await query(`
      SELECT l.*,
        COALESCE((SELECT SUM(montant) FROM achats WHERE lead_id = l.id), 0) as total_achats,
        (SELECT COUNT(*) FROM achats WHERE lead_id = l.id) as nb_achats
      FROM leads l WHERE l.user_id = $1 ORDER BY l.updated_at DESC
    `, [user.id]);
    return res.json(result.rows);
  }

  if (req.method === 'POST') {
    const { nom, contact, statut, notes, date_premier_contact, offre_interet, decouverte } = req.body;
    if (!nom) return res.status(400).json({ message: 'Le nom est requis.' });
    const result = await query(
      `INSERT INTO leads (user_id, nom, contact, statut, notes, date_premier_contact, offre_interet, decouverte)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [user.id, nom, contact || '', statut || 'Cold', notes || '', date_premier_contact || null, offre_interet || '', decouverte || '']
    );
    return res.json({ ...result.rows[0], total_achats: 0, nb_achats: 0 });
  }

  res.status(405).end();
};

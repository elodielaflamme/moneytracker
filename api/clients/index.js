const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const result = await query(`
      SELECT c.*,
        COALESCE((SELECT SUM(montant) FROM achats WHERE client_id = c.id), 0) as total_achats,
        (SELECT COUNT(*) FROM achats WHERE client_id = c.id) as nb_achats
      FROM clients c WHERE c.user_id = $1 ORDER BY c.created_at DESC
    `, [user.id]);
    return res.json(result.rows);
  }

  if (req.method === 'POST') {
    const { nom, contact, notes, date_premier_contact, offre_interet } = req.body;
    if (!nom) return res.status(400).json({ message: 'Le nom est requis.' });
    const result = await query(
      `INSERT INTO clients (user_id, nom, contact, notes, date_premier_contact, offre_interet)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user.id, nom, contact || '', notes || '', date_premier_contact || null, offre_interet || '']
    );
    return res.json({ ...result.rows[0], total_achats: 0, nb_achats: 0 });
  }

  res.status(405).end();
};

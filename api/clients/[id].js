const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { nom, contact, notes, date_premier_contact, offre_interet } = req.body;
    const cRes = await query('SELECT * FROM clients WHERE id = $1 AND user_id = $2', [id, user.id]);
    const c = cRes.rows[0];
    if (!c) return res.status(404).json({ message: 'Client introuvable.' });

    await query(
      `UPDATE clients SET nom=$1, contact=$2, notes=$3, date_premier_contact=$4, offre_interet=$5
       WHERE id=$6 AND user_id=$7`,
      [
        nom ?? c.nom,
        contact ?? c.contact,
        notes ?? c.notes,
        date_premier_contact !== undefined ? date_premier_contact : c.date_premier_contact,
        offre_interet !== undefined ? offre_interet : (c.offre_interet || ''),
        id, user.id,
      ]
    );
    const updated = await query('SELECT * FROM clients WHERE id = $1', [id]);
    const stats = await query(
      'SELECT COALESCE(SUM(montant),0) as total_achats, COUNT(*) as nb_achats FROM achats WHERE client_id = $1',
      [id]
    );
    return res.json({ ...updated.rows[0], ...stats.rows[0] });
  }

  if (req.method === 'DELETE') {
    const result = await query('DELETE FROM clients WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Client introuvable.' });
    return res.json({ success: true });
  }

  res.status(405).end();
};

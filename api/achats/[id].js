const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;
  if (req.method !== 'DELETE') return res.status(405).end();

  const { id } = req.query;
  const result = await query('DELETE FROM achats WHERE id = $1 AND user_id = $2', [id, user.id]);
  if (!result.rowCount) return res.status(404).json({ message: 'Achat introuvable.' });
  res.json({ success: true });
};

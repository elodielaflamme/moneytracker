const setCors = require('../../lib/cors');
const getUser = require('../../lib/auth');
const { query } = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;
  if (req.method !== 'PATCH') return res.status(405).end();

  const { id } = req.query;
  const suiviRes = await query('SELECT * FROM suivis WHERE id = $1 AND user_id = $2', [id, user.id]);
  const suivi = suiviRes.rows[0];
  if (!suivi) return res.status(404).json({ message: 'Suivi introuvable.' });

  const newVal = suivi.effectue ? 0 : 1;
  await query('UPDATE suivis SET effectue = $1 WHERE id = $2', [newVal, id]);
  res.json({ ...suivi, effectue: newVal });
};

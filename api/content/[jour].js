const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  const jour = parseInt(req.query.jour);
  if (isNaN(jour) || jour < 1 || jour > 365)
    return res.status(400).json({ message: 'Jour invalide.' });

  if (req.method === 'PUT') {
    const { type, hook } = req.body;
    await query(
      `INSERT INTO content_overrides (user_id, jour, type, hook) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, jour) DO UPDATE SET type = $3, hook = $4`,
      [user.id, jour, type, hook]
    );
    return res.json({ jour, type, hook, custom: true });
  }

  if (req.method === 'DELETE') {
    await query('DELETE FROM content_overrides WHERE user_id = $1 AND jour = $2', [user.id, jour]);
    return res.json({ success: true });
  }

  res.status(405).end();
};

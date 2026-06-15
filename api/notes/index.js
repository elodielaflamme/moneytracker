const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const result = await query('SELECT * FROM notes WHERE user_id = $1', [user.id]);
    return res.json(result.rows[0] || { contenu: '' });
  }

  if (req.method === 'PUT') {
    const { contenu } = req.body;
    await query(
      `INSERT INTO notes (user_id, contenu) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET contenu = $2, updated_at = NOW()`,
      [user.id, contenu]
    );
    return res.json({ success: true });
  }

  res.status(405).end();
};

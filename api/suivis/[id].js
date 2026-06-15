const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  const { id } = req.query;

  // GET /api/suivis/:leadId — list suivis for a lead
  if (req.method === 'GET') {
    const leadRes = await query('SELECT id FROM leads WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (!leadRes.rows.length) return res.status(404).json({ message: 'Lead introuvable.' });
    const result = await query(
      'SELECT * FROM suivis WHERE lead_id = $1 ORDER BY date_suivi DESC, created_at DESC',
      [id]
    );
    return res.json(result.rows);
  }

  // POST /api/suivis/:leadId — add suivi for a lead
  if (req.method === 'POST') {
    const leadRes = await query('SELECT id FROM leads WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (!leadRes.rows.length) return res.status(404).json({ message: 'Lead introuvable.' });
    const { date_suivi, description } = req.body;
    if (!date_suivi || !description)
      return res.status(400).json({ message: 'Date et description requises.' });
    const result = await query(
      'INSERT INTO suivis (lead_id, user_id, date_suivi, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, user.id, date_suivi, description]
    );
    return res.json(result.rows[0]);
  }

  // DELETE /api/suivis/:id — delete suivi by its own id
  if (req.method === 'DELETE') {
    const result = await query('DELETE FROM suivis WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Suivi introuvable.' });
    return res.json({ success: true });
  }

  res.status(405).end();
};

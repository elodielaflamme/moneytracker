const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query, getPool } = require('../lib/db');

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'PUT') {
    const { nom, contact, statut, notes, date_premier_contact, offre_interet, decouverte } = req.body;
    const leadRes = await query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', [id, user.id]);
    const lead = leadRes.rows[0];
    if (!lead) return res.status(404).json({ message: 'Lead introuvable.' });

    if (statut === 'Purchased' && lead.statut !== 'Purchased') {
      const pool = await getPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const finalNom = nom ?? lead.nom;
        const finalContact = contact ?? lead.contact;
        const finalNotes = notes ?? lead.notes;
        const finalDate = date_premier_contact !== undefined ? date_premier_contact : lead.date_premier_contact;
        const finalOffre = offre_interet !== undefined ? offre_interet : (lead.offre_interet || '');

        const clientRes = await client.query(
          `INSERT INTO clients (user_id, nom, contact, notes, date_premier_contact, offre_interet)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [user.id, finalNom, finalContact || '', finalNotes || '', finalDate || null, finalOffre]
        );
        const newClient = clientRes.rows[0];

        await client.query('UPDATE achats SET client_id = $1, lead_id = NULL WHERE lead_id = $2', [newClient.id, id]);
        await client.query('DELETE FROM leads WHERE id = $1 AND user_id = $2', [id, user.id]);
        await client.query('COMMIT');

        const statsRes = await query(
          'SELECT COALESCE(SUM(montant),0) as total_achats, COUNT(*) as nb_achats FROM achats WHERE client_id = $1',
          [newClient.id]
        );
        return res.json({ converted: true, client: { ...newClient, ...statsRes.rows[0] } });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erreur conversion lead → client:', err.message);
        return res.status(500).json({ message: `Erreur lors de la conversion : ${err.message}` });
      } finally {
        client.release();
      }
    }

    await query(
      `UPDATE leads SET nom=$1, contact=$2, statut=$3, notes=$4, date_premier_contact=$5,
       offre_interet=$6, decouverte=$7, updated_at=NOW() WHERE id=$8 AND user_id=$9`,
      [
        nom ?? lead.nom,
        contact ?? lead.contact,
        statut ?? lead.statut,
        notes ?? lead.notes,
        date_premier_contact !== undefined ? date_premier_contact : lead.date_premier_contact,
        offre_interet !== undefined ? offre_interet : (lead.offre_interet || ''),
        decouverte !== undefined ? decouverte : (lead.decouverte || ''),
        id, user.id,
      ]
    );
    const updated = await query('SELECT * FROM leads WHERE id = $1', [id]);
    const stats = await query(
      'SELECT COALESCE(SUM(montant),0) as total_achats, COUNT(*) as nb_achats FROM achats WHERE lead_id = $1',
      [id]
    );
    return res.json({ ...updated.rows[0], ...stats.rows[0] });
  }

  if (req.method === 'DELETE') {
    const result = await query('DELETE FROM leads WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Lead introuvable.' });
    return res.json({ success: true });
  }

  res.status(405).end();
};

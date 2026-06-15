const setCors = require('../lib/cors');
const getUser = require('../lib/auth');
const { query } = require('../lib/db');
const { getDefaults } = require('../lib/content-data');

const DEFAULTS = getDefaults();

module.exports = async function handler(req, res) {
  if (setCors(req, res)) return;
  const user = getUser(req, res);
  if (!user) return;
  if (req.method !== 'GET') return res.status(405).end();

  const overrides = await query('SELECT * FROM content_overrides WHERE user_id = $1', [user.id]);
  const customMap = {};
  for (const o of overrides.rows) customMap[o.jour] = o;

  const result = DEFAULTS.map(d => ({
    jour: d.jour,
    type: customMap[d.jour]?.type || d.type,
    hook: customMap[d.jour]?.hook || d.hook,
    custom: !!customMap[d.jour],
  }));
  res.json(result);
};

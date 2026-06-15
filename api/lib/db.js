const { Pool, types } = require('pg');

// Return timestamps as strings (same format as SQLite ISO strings)
types.setTypeParser(1184, v => v); // timestamptz
types.setTypeParser(1114, v => v); // timestamp

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
  max: 5,
});

let schemaReady = null;

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      prenom TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      contact TEXT DEFAULT '',
      statut TEXT DEFAULT 'Cold',
      notes TEXT DEFAULT '',
      date_premier_contact TEXT,
      offre_interet TEXT DEFAULT '',
      decouverte TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ventes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      montant FLOAT8 NOT NULL DEFAULT 0,
      montant_mensuel FLOAT8,
      type_paiement TEXT NOT NULL DEFAULT 'PIF',
      plan_paiement TEXT DEFAULT 'PIF',
      devise TEXT DEFAULT 'CAD',
      nom_client TEXT DEFAULT '',
      nom_offre TEXT DEFAULT '',
      description TEXT DEFAULT '',
      statut TEXT DEFAULT 'Complété',
      date_vente TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nom TEXT NOT NULL,
      contact TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      date_premier_contact TEXT,
      offre_interet TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      contenu TEXT DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS achats (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date_achat TEXT NOT NULL,
      produit TEXT NOT NULL,
      montant FLOAT8 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS suivis (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date_suivi TEXT NOT NULL,
      description TEXT NOT NULL,
      effectue INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS content_overrides (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      jour INTEGER NOT NULL,
      type TEXT NOT NULL,
      hook TEXT NOT NULL,
      UNIQUE(user_id, jour)
    );
  `);
}

async function query(sql, params) {
  if (!schemaReady) schemaReady = initSchema();
  await schemaReady;
  return pool.query(sql, params);
}

async function getPool() {
  if (!schemaReady) schemaReady = initSchema();
  await schemaReady;
  return pool;
}

module.exports = { query, getPool };

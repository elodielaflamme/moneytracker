const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'sales_tracker.db'));

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    prenom TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    contact TEXT,
    statut TEXT DEFAULT 'Cold',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ventes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    montant REAL NOT NULL,
    type_paiement TEXT NOT NULL,
    description TEXT,
    statut TEXT DEFAULT 'Complété',
    date_vente DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    contact TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    contenu TEXT DEFAULT '',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS achats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    client_id INTEGER,
    user_id INTEGER NOT NULL,
    date_achat TEXT NOT NULL,
    produit TEXT NOT NULL,
    montant REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS suivis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    date_suivi TEXT NOT NULL,
    description TEXT NOT NULL,
    effectue INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Idempotent ventes column migrations
try { db.exec(`ALTER TABLE ventes ADD COLUMN plan_paiement TEXT DEFAULT 'PIF'`); } catch {}
try { db.exec(`ALTER TABLE ventes ADD COLUMN devise TEXT DEFAULT 'CAD'`); } catch {}
try { db.exec(`ALTER TABLE ventes ADD COLUMN nom_client TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE ventes ADD COLUMN nom_offre TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE ventes ADD COLUMN montant_mensuel REAL`); } catch {}

// Idempotent column migrations
try { db.exec(`ALTER TABLE leads ADD COLUMN date_premier_contact TEXT`); } catch {}
try { db.exec(`ALTER TABLE leads ADD COLUMN offre_interet TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE clients ADD COLUMN date_premier_contact TEXT`); } catch {}
try { db.exec(`ALTER TABLE clients ADD COLUMN offre_interet TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE leads ADD COLUMN decouverte TEXT DEFAULT ''`); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS content_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    jour INTEGER NOT NULL,
    type TEXT NOT NULL,
    hook TEXT NOT NULL,
    UNIQUE(user_id, jour),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

module.exports = db;

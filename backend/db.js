const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'cantieri.db');
const db = new Database(DB_PATH, { verbose: null });

// WAL mode per concorrenza
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS utenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    pin_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cantieri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tratta TEXT,
    km_inizio TEXT,
    km_fine TEXT,
    binario TEXT DEFAULT 'entrambi',
    tipo TEXT DEFAULT 'notturno',
    orario_interruzione TEXT,
    data_inizio DATE,
    data_fine DATE,
    ultimo_km TEXT,
    giorni TEXT DEFAULT '0,1,2,3,4,5,6',
    note TEXT,
    urgente INTEGER DEFAULT 0,
    stato TEXT DEFAULT 'attivo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cantiere_id INTEGER NOT NULL,
    data DATE NOT NULL,
    stato TEXT DEFAULT 'programmata',
    motivo_salto TEXT,
    squadra TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cantiere_id) REFERENCES cantieri(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS saldature (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notte_id INTEGER NOT NULL,
    cantiere_id INTEGER NOT NULL,
    km TEXT NOT NULL,
    lato TEXT,
    tipo TEXT,
    stato TEXT DEFAULT 'ok',
    codice_difetto TEXT,
    note TEXT,
    raw_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notte_id) REFERENCES notti(id) ON DELETE CASCADE,
    FOREIGN KEY (cantiere_id) REFERENCES cantieri(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS difetti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cantiere_id INTEGER NOT NULL,
    saldatura_id INTEGER,
    km TEXT NOT NULL,
    lato TEXT,
    codice TEXT NOT NULL,
    risolto INTEGER DEFAULT 0,
    data_trovato DATE,
    data_risolto DATE,
    FOREIGN KEY (cantiere_id) REFERENCES cantieri(id) ON DELETE CASCADE,
    FOREIGN KEY (saldatura_id) REFERENCES saldature(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS binari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cantiere_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    km_inizio TEXT,
    km_fine TEXT,
    ultimo_km TEXT,
    note TEXT,
    FOREIGN KEY (cantiere_id) REFERENCES cantieri(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessioni (
    token TEXT PRIMARY KEY,
    utente_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
  );
`);

// Helper: hash PIN
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// Seed: utente default se tabella vuota
const count = db.prepare('SELECT COUNT(*) as n FROM utenti').get();
if (count.n === 0) {
  const stmt = db.prepare('INSERT INTO utenti (nome, pin_hash) VALUES (?, ?)');
  stmt.run('Ludovico', hashPin('1234'));
  stmt.run('Cristopher', hashPin('5678'));
  console.log('Utenti default creati (PIN: Ludovico=1234, Cristopher=5678)');
}

// Migrazioni
const migrations = [
  { name: 'notti_posizione_link', sql: 'ALTER TABLE notti ADD COLUMN posizione_link TEXT' },
  { name: 'notti_num_saldature', sql: 'ALTER TABLE notti ADD COLUMN num_saldature INTEGER DEFAULT 0' },
  { name: 'notti_km_inizio', sql: 'ALTER TABLE notti ADD COLUMN km_inizio TEXT' },
  { name: 'notti_km_fine', sql: 'ALTER TABLE notti ADD COLUMN km_fine TEXT' },
  { name: 'notti_km_percorsi', sql: 'ALTER TABLE notti ADD COLUMN km_percorsi REAL' },
];

for (const m of migrations) {
  try { db.exec(m.sql); } catch (e) { /* colonna già esiste */ }
}

// Indici per performance
const indices = [
  'CREATE INDEX IF NOT EXISTS idx_notti_cantiere_data ON notti(cantiere_id, data)',
  'CREATE INDEX IF NOT EXISTS idx_notti_data ON notti(data)',
  'CREATE INDEX IF NOT EXISTS idx_saldature_notte_id ON saldature(notte_id)',
  'CREATE INDEX IF NOT EXISTS idx_saldature_cantiere_id ON saldature(cantiere_id)',
  'CREATE INDEX IF NOT EXISTS idx_difetti_cantiere_id ON difetti(cantiere_id)',
  'CREATE INDEX IF NOT EXISTS idx_difetti_risolto ON difetti(cantiere_id, risolto)',
];
for (const sql of indices) {
  try { db.exec(sql); } catch (e) { /* skip */ }
}

module.exports = { db, hashPin };

const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Genera notti programmate tra data_inizio e data_fine
function generaNotti(cantiereId, dataInizio, dataFine, giorni) {
  if (!dataInizio || !dataFine) return;

  const start = new Date(dataInizio + 'T12:00:00');
  const end = new Date(dataFine + 'T12:00:00');
  if (isNaN(start) || isNaN(end) || start > end) return;

  // giorni = "0,1,2,3,4,5,6" dove 0=dom, 1=lun, ..., 6=sab
  const giorniAttivi = new Set((giorni || '0,1,2,3,4,5,6').split(',').map(Number));

  const existing = db.prepare('SELECT data FROM notti WHERE cantiere_id = ?').all(cantiereId);
  const existingSet = new Set(existing.map(n => n.data));

  const stmt = db.prepare(`
    INSERT INTO notti (cantiere_id, data, stato) VALUES (?, ?, 'programmata')
  `);

  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const ds = d.toISOString().split('T')[0];
    if (!existingSet.has(ds) && giorniAttivi.has(d.getDay())) {
      stmt.run(cantiereId, ds);
      count++;
    }
    d.setDate(d.getDate() + 1);
  }
  return count;
}

// GET /api/cantieri
router.get('/', (req, res) => {
  const cantieri = db.prepare('SELECT * FROM cantieri ORDER BY urgente DESC, nome ASC').all();
  res.json(cantieri);
});

// GET /api/cantieri/:id
router.get('/:id', (req, res) => {
  const cantiere = db.prepare('SELECT * FROM cantieri WHERE id = ?').get(req.params.id);
  if (!cantiere) return res.status(404).json({ error: 'Cantiere non trovato' });
  res.json(cantiere);
});

// POST /api/cantieri
router.post('/', (req, res) => {
  const { nome, tratta, km_inizio, km_fine, binario, tipo, orario_interruzione,
          data_inizio, data_fine, ultimo_km, giorni, note, urgente } = req.body;

  if (!nome) return res.status(400).json({ error: 'Nome obbligatorio' });

  const result = db.prepare(`
    INSERT INTO cantieri (nome, tratta, km_inizio, km_fine, binario, tipo,
      orario_interruzione, data_inizio, data_fine, ultimo_km, giorni, note, urgente)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nome, tratta || null, km_inizio || null, km_fine || null,
         binario || 'entrambi', tipo || 'notturno', orario_interruzione || null,
         data_inizio || null, data_fine || null, ultimo_km || null,
         giorni || '0,1,2,3,4,5,6', note || null, urgente ? 1 : 0);

  const cantiere = db.prepare('SELECT * FROM cantieri WHERE id = ?').get(result.lastInsertRowid);

  // Genera notti automatiche
  const nottiCreate = generaNotti(cantiere.id, data_inizio, data_fine, cantiere.giorni);

  res.status(201).json({ ...cantiere, notti_generate: nottiCreate || 0 });
});

// PUT /api/cantieri/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cantieri WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Cantiere non trovato' });

  const fields = ['nome', 'tratta', 'km_inizio', 'km_fine', 'binario', 'tipo',
    'orario_interruzione', 'data_inizio', 'data_fine', 'ultimo_km', 'giorni', 'note', 'urgente', 'stato'];

  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'urgente' ? (req.body[f] ? 1 : 0) : req.body[f]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

  values.push(req.params.id);
  db.prepare(`UPDATE cantieri SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const cantiere = db.prepare('SELECT * FROM cantieri WHERE id = ?').get(req.params.id);

  // Rigenera notti se le date o i giorni sono cambiati
  if (req.body.data_inizio !== undefined || req.body.data_fine !== undefined || req.body.giorni !== undefined) {
    const nottiCreate = generaNotti(cantiere.id, cantiere.data_inizio, cantiere.data_fine, cantiere.giorni);
    return res.json({ ...cantiere, notti_generate: nottiCreate || 0 });
  }

  res.json(cantiere);
});

// DELETE /api/cantieri/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM cantieri WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cantiere non trovato' });
  res.json({ ok: true });
});

module.exports = router;

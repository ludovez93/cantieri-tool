const express = require('express');
const { db } = require('../db');

const router = express.Router();

// GET /api/cantieri/:cantiereId/binari
router.get('/cantieri/:cantiereId/binari', (req, res) => {
  const binari = db.prepare('SELECT * FROM binari WHERE cantiere_id = ? ORDER BY tipo ASC')
    .all(req.params.cantiereId);
  res.json(binari);
});

// POST /api/cantieri/:cantiereId/binari
router.post('/cantieri/:cantiereId/binari', (req, res) => {
  const cantiere = db.prepare('SELECT id FROM cantieri WHERE id = ?').get(req.params.cantiereId);
  if (!cantiere) return res.status(404).json({ error: 'Cantiere non trovato' });

  const { tipo, km_inizio, km_fine, ultimo_km, note } = req.body;
  if (!tipo) return res.status(400).json({ error: 'Tipo obbligatorio (pari/dispari)' });

  const result = db.prepare(`
    INSERT INTO binari (cantiere_id, tipo, km_inizio, km_fine, ultimo_km, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.cantiereId, tipo, km_inizio || null, km_fine || null, ultimo_km || null, note || null);

  const binario = db.prepare('SELECT * FROM binari WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(binario);
});

// PUT /api/binari/:id
router.put('/binari/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM binari WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Binario non trovato' });

  const fields = ['tipo', 'km_inizio', 'km_fine', 'ultimo_km', 'note'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Nessun campo da aggiornare' });

  values.push(req.params.id);
  db.prepare(`UPDATE binari SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const binario = db.prepare('SELECT * FROM binari WHERE id = ?').get(req.params.id);
  res.json(binario);
});

// DELETE /api/binari/:id
router.delete('/binari/:id', (req, res) => {
  const result = db.prepare('DELETE FROM binari WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Binario non trovato' });
  res.json({ ok: true });
});

module.exports = router;

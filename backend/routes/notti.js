const express = require('express');
const { db } = require('../db');

const router = express.Router();

// GET /api/cantieri/:cantiereId/notti
router.get('/cantieri/:cantiereId/notti', (req, res) => {
  const notti = db.prepare(`
    SELECT n.*,
      CASE WHEN n.num_saldature > 0 THEN n.num_saldature
           ELSE (SELECT COUNT(*) FROM saldature s WHERE s.notte_id = n.id) END as num_saldature
    FROM notti n
    WHERE n.cantiere_id = ?
    ORDER BY n.data DESC
  `).all(req.params.cantiereId);
  res.json(notti);
});

// POST /api/cantieri/:cantiereId/notti
router.post('/cantieri/:cantiereId/notti', (req, res) => {
  const cantiere = db.prepare('SELECT id FROM cantieri WHERE id = ?').get(req.params.cantiereId);
  if (!cantiere) return res.status(404).json({ error: 'Cantiere non trovato' });

  const { data, stato, motivo_salto, squadra, note } = req.body;
  if (!data) return res.status(400).json({ error: 'Data obbligatoria' });

  const result = db.prepare(`
    INSERT INTO notti (cantiere_id, data, stato, motivo_salto, squadra, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.params.cantiereId, data, stato || 'programmata',
         motivo_salto || null, squadra || null, note || null);

  const notte = db.prepare('SELECT * FROM notti WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(notte);
});

// PUT /api/notti/:id
router.put('/notti/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM notti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Notte non trovata' });

  const fields = ['data', 'stato', 'motivo_salto', 'squadra', 'note'];
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
  db.prepare(`UPDATE notti SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const notte = db.prepare('SELECT * FROM notti WHERE id = ?').get(req.params.id);
  res.json(notte);
});

// POST /api/notti/:id/scala — scala notti successive dopo un salto
router.post('/notti/:id/scala', (req, res) => {
  const notte = db.prepare('SELECT * FROM notti WHERE id = ?').get(req.params.id);
  if (!notte) return res.status(404).json({ error: 'Notte non trovata' });
  if (notte.stato !== 'saltata') return res.status(400).json({ error: 'La notte non è saltata' });

  // Scala di 1 giorno tutte le notti programmate successive
  const updated = db.prepare(`
    UPDATE notti SET data = date(data, '+1 day')
    WHERE cantiere_id = ? AND data > ? AND stato = 'programmata'
  `).run(notte.cantiere_id, notte.data);

  res.json({ ok: true, notti_scalate: updated.changes });
});

module.exports = router;

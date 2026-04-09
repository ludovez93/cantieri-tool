const express = require('express');
const { db } = require('../db');

const router = express.Router();

// GET /api/cantieri/:cantiereId/saldature
router.get('/cantieri/:cantiereId/saldature', (req, res) => {
  const saldature = db.prepare(`
    SELECT s.*, n.data as data_notte
    FROM saldature s
    JOIN notti n ON s.notte_id = n.id
    WHERE s.cantiere_id = ?
    ORDER BY n.data DESC, s.km ASC
  `).all(req.params.cantiereId);
  res.json(saldature);
});

// GET /api/cantieri/:cantiereId/difetti
router.get('/cantieri/:cantiereId/difetti', (req, res) => {
  const difetti = db.prepare(`
    SELECT * FROM difetti WHERE cantiere_id = ? ORDER BY data_trovato DESC
  `).all(req.params.cantiereId);
  res.json(difetti);
});

// PUT /api/difetti/:id — segna risolto
router.put('/difetti/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM difetti WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Difetto non trovato' });

  const risolto = req.body.risolto ? 1 : 0;
  const data_risolto = risolto ? new Date().toISOString().split('T')[0] : null;

  db.prepare('UPDATE difetti SET risolto = ?, data_risolto = ? WHERE id = ?')
    .run(risolto, data_risolto, req.params.id);

  const difetto = db.prepare('SELECT * FROM difetti WHERE id = ?').get(req.params.id);
  res.json(difetto);
});

module.exports = router;

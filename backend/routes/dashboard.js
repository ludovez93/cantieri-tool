const express = require('express');
const { db } = require('../db');

const router = express.Router();

// GET /api/dashboard
router.get('/dashboard', (req, res) => {
  const cantieri = db.prepare(`
    SELECT c.*,
      (SELECT COALESCE(SUM(CASE WHEN n2.num_saldature > 0 THEN n2.num_saldature
        ELSE (SELECT COUNT(*) FROM saldature s WHERE s.notte_id = n2.id) END), 0)
        FROM notti n2 WHERE n2.cantiere_id = c.id AND n2.stato = 'completata') as totale_saldature,
      (SELECT COUNT(*) FROM difetti WHERE cantiere_id = c.id AND risolto = 0) as difetti_aperti,
      (SELECT COUNT(*) FROM notti WHERE cantiere_id = c.id AND stato = 'completata') as notti_completate
    FROM cantieri c
    WHERE c.stato = 'attivo'
    ORDER BY c.urgente DESC, c.data_fine ASC
  `).all();

  // Tutte le notti future (programmate + completate recenti)
  const oggi = new Date().toISOString().split('T')[0];
  const settimanafa = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const tutteNotti = db.prepare(`
    SELECT n.id, n.data, n.stato, n.squadra, n.motivo_salto,
           c.id as cantiere_id, c.nome, c.tipo, c.urgente, c.data_fine,
           (SELECT COUNT(*) FROM saldature s WHERE s.notte_id = n.id) as num_saldature
    FROM notti n
    JOIN cantieri c ON n.cantiere_id = c.id
    WHERE n.data >= ? AND c.stato = 'attivo'
    ORDER BY n.data ASC, c.nome ASC
  `).all(settimanafa);

  res.json({ cantieri, tutteNotti });
});

// GET /api/timeline?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/timeline', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from e to obbligatori' });

  const cantieri = db.prepare('SELECT id, nome, urgente, stato FROM cantieri WHERE stato = ?').all('attivo');

  const notti = db.prepare(`
    SELECT n.*,
      c.nome as cantiere_nome,
      CASE WHEN n.num_saldature > 0 THEN n.num_saldature
        ELSE (SELECT COUNT(*) FROM saldature s WHERE s.notte_id = n.id) END as num_saldature
    FROM notti n
    JOIN cantieri c ON n.cantiere_id = c.id
    WHERE n.data BETWEEN ? AND ? AND c.stato = 'attivo'
    ORDER BY n.data ASC
  `).all(from, to);

  res.json({ cantieri, notti });
});

module.exports = router;

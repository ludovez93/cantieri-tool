const express = require('express');
const crypto = require('crypto');
const { db, hashPin } = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { nome, pin } = req.body;
  if (!nome || !pin) {
    return res.status(400).json({ error: 'Nome e PIN obbligatori' });
  }

  const utente = db.prepare('SELECT * FROM utenti WHERE nome = ? AND pin_hash = ?')
    .get(nome, hashPin(pin));

  if (!utente) {
    return res.status(401).json({ error: 'Credenziali errate' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessioni (token, utente_id) VALUES (?, ?)').run(token, utente.id);

  res.json({ token, utente: { id: utente.id, nome: utente.nome } });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    db.prepare('DELETE FROM sessioni WHERE token = ?').run(header.slice(7));
  }
  res.json({ ok: true });
});

// GET /api/auth/utenti (lista nomi per login screen)
router.get('/utenti', (req, res) => {
  const utenti = db.prepare('SELECT id, nome FROM utenti').all();
  res.json(utenti);
});

module.exports = router;

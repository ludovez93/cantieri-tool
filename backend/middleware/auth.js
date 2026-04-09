const { db } = require('../db');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  const token = header.slice(7);
  const sessione = db.prepare(`
    SELECT s.utente_id, u.nome
    FROM sessioni s JOIN utenti u ON s.utente_id = u.id
    WHERE s.token = ?
  `).get(token);

  if (!sessione) {
    return res.status(401).json({ error: 'Token non valido' });
  }

  req.utente = { id: sessione.utente_id, nome: sessione.nome };
  next();
}

module.exports = authMiddleware;

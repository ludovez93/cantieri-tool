const express = require('express');
const { db } = require('../db');

const router = express.Router();

// Codici difetto (da M2 Tool v2)
const CODICI_DIFETTO = [
  '113', '213', '235', '135.1', '135.2', '212.1', '212.2',
  '112.1', '112.2', '211', '236', '412', '422', '132.1', '132.2',
  '232.1', '232.2', '4112', '4212', '4213', '411.1', '411.2',
  '421.1', '421.2', '421.3', '471', '211MO'
];

function trovaDifetto(testo) {
  const t = testo.toUpperCase().trim();
  for (const cod of CODICI_DIFETTO) {
    const escaped = cod.replace(/\./g, '\\.');
    const re = new RegExp('\\b' + escaped + '\\b', 'i');
    if (re.test(t)) return cod;
  }
  return null;
}

function parseListaSaldature(testo) {
  // Pre-process: splitta righe con più saldature attaccate
  const righeRaw = testo.split('\n').map(r => r.trim()).filter(r => r.length > 0);
  const righe = [];
  const reSplit = /(\d+\+\d+\s+(?:DX|SX))/gi;
  for (const riga of righeRaw) {
    const matches = riga.match(reSplit);
    if (matches && matches.length > 1) {
      // Splitta la riga in più saldature
      let rest = riga;
      for (let i = 0; i < matches.length; i++) {
        const idx = rest.indexOf(matches[i]);
        if (i > 0 && idx > 0) {
          // Aggiungi la parte prima come continuazione della precedente
        }
        const nextIdx = i < matches.length - 1 ? rest.indexOf(matches[i + 1], idx + matches[i].length) : rest.length;
        righe.push(rest.substring(idx, nextIdx).trim());
        rest = rest.substring(nextIdx);
      }
    } else {
      righe.push(riga);
    }
  }

  const saldature = [];
  const ignorate = [];
  const reKm = /^(\d+\+\d+)\s+(DX|SX)(.*)?$/i;
  let dataEstratta = null;

  // Cerca data nel testo (Notte GG-GG/MM/AAAA o GG/MM/AAAA)
  let dataFine = null;
  for (const riga of righe) {
    const mNotte = riga.match(/Notte\s+(\d{1,2})-(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (mNotte) {
      dataEstratta = `${mNotte[4]}-${mNotte[3].padStart(2,'0')}-${mNotte[1].padStart(2,'0')}`;
      dataFine = `${mNotte[4]}-${mNotte[3].padStart(2,'0')}-${mNotte[2].padStart(2,'0')}`;
      break;
    }
    const mData = riga.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mData) {
      dataEstratta = `${mData[3]}-${mData[2].padStart(2,'0')}-${mData[1].padStart(2,'0')}`;
      break;
    }
  }

  for (const riga of righe) {
    // Ignora righe metadata
    if (/^(totale|total|http|www\.|---)/i.test(riga)) {
      ignorate.push(riga);
      continue;
    }

    const match = riga.match(reKm);
    if (match) {
      const km = match[1];
      const lato = match[2].toUpperCase();
      const resto = match[3] || '';

      const isAll = /\bALL(UMINOTERMICA)?\b/i.test(resto);
      const tipo = isAll ? 'ALL' : 'Scintillio';

      const codice = trovaDifetto(resto);
      const isNoDac = /\bNO\s*DAC\b/i.test(resto);

      let stato = 'ok';
      if (isNoDac) stato = 'nodac';
      else if (codice || /DIFETTO\s*VISIVO/i.test(resto)) stato = 'diff';

      saldature.push({ km, lato, tipo, stato, codice_difetto: codice, note: resto.trim() || null, raw_text: riga });
    } else {
      // Potrebbe essere riga di contesto di una saldatura precedente
      if (saldature.length > 0) {
        const prev = saldature[saldature.length - 1];
        const codice = trovaDifetto(riga);
        if (codice && !prev.codice_difetto) {
          prev.codice_difetto = codice;
          prev.stato = 'diff';
          prev.note = (prev.note ? prev.note + ' ' : '') + riga;
        } else if (/NO\s*DAC/i.test(riga)) {
          prev.stato = 'nodac';
          prev.note = (prev.note ? prev.note + ' ' : '') + riga;
        }
      } else {
        ignorate.push(riga);
      }
    }
  }

  const difetti = saldature.filter(s => s.stato === 'diff' || s.stato === 'nodac');

  return {
    totale: saldature.length,
    difetti_count: difetti.length,
    difetti: difetti.map(d => ({ km: d.km, lato: d.lato, codice: d.codice_difetto, stato: d.stato })),
    ignorate: ignorate.length,
    righe_ignorate: ignorate,
    saldature,
    data: dataEstratta,
    data_fine: dataFine
  };
}

// Parser riepilogo WhatsApp
function parseRiepilogo(testo) {
  const righe = testo.split('\n').map(r => r.trim()).filter(r => r.length > 0);
  const result = {
    notte_numero: null,
    notte_totale: null,
    linea: null,
    data: null,
    data_fine: null,
    binari: [],
    squadra: null,
    km_percorsi: null,
    saldature: 0,
    difetti: 0,
    indicazioni: [],
    note: []
  };

  let currentBinario = null;

  for (const riga of righe) {
    // Cantiere X/Y
    const mCantiere = riga.match(/^Cantiere\s+(\d+)\/(\d+)$/i);
    if (mCantiere) {
      result.notte_numero = parseInt(mCantiere[1]);
      result.notte_totale = parseInt(mCantiere[2]);
      continue;
    }

    // Notte GG-GG/MM/AAAA
    const mNotte = riga.match(/^Notte\s+(\d{1,2})-(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    if (mNotte) {
      const giorno = mNotte[1].padStart(2, '0');
      const giorno2 = mNotte[2].padStart(2, '0');
      const mese = mNotte[3].padStart(2, '0');
      const anno = mNotte[4];
      result.data = `${anno}-${mese}-${giorno}`;
      result.data_fine = `${anno}-${mese}-${giorno2}`;
      continue;
    }

    // Linea
    const mLinea = riga.match(/^Linea:\s*(.+)$/i);
    if (mLinea) {
      result.linea = mLinea[1].trim();
      continue;
    }
    // Linea senza prefisso (riga dopo Notte se non ha altri pattern)
    if (!result.linea && result.data && !riga.match(/^(Da Km|a Km|Operatori|Binario|Saldature|Nota|Cantiere|\d)/i)) {
      result.linea = riga;
      continue;
    }

    // Binario
    const mBinario = riga.match(/^Binario:\s*(Pari|Dispari|Unico)/i);
    if (mBinario) {
      currentBinario = { tipo: mBinario[1].toLowerCase(), km_inizio: null, km_fine: null };
      result.binari.push(currentBinario);
      continue;
    }

    // Da Km / a Km su righe separate
    const mDaKm = riga.match(/^Da Km:\s*(\d+\+\d+)/i);
    if (mDaKm) {
      if (currentBinario) currentBinario.km_inizio = mDaKm[1];
      continue;
    }
    const mAKm = riga.match(/^a Km:\s*(\d+\+\d+)/i);
    if (mAKm) {
      if (currentBinario) currentBinario.km_fine = mAKm[1];
      continue;
    }

    // Km su una riga: "113+700 a 117+300"
    const mKmRiga = riga.match(/^(\d+\+\d+)\s+a\s+(\d+\+\d+)$/i);
    if (mKmRiga) {
      if (currentBinario) {
        currentBinario.km_inizio = mKmRiga[1];
        currentBinario.km_fine = mKmRiga[2];
      }
      continue;
    }

    // Operatori
    const mOp = riga.match(/^Operatori:\s*(.+)$/i);
    if (mOp) {
      result.squadra = mOp[1].trim();
      continue;
    }

    // Km percorsi (numero da solo su riga, tipo 1.6 o 0.7)
    const mKmPerc = riga.match(/^(\d+\.\d+)$/);
    if (mKmPerc) {
      result.km_percorsi = parseFloat(mKmPerc[1]);
      continue;
    }

    // Saldature controllate
    const mSald = riga.match(/Saldature controllate:\s*(\d+)/i);
    if (mSald) {
      result.saldature = parseInt(mSald[1]);
      continue;
    }

    // Saldature difettose: N + N NO DAC + N Difetto Visivo
    const mDif = riga.match(/Saldature difettose:\s*(.+)/i);
    if (mDif) {
      const parti = mDif[1];
      // Primo numero = difetti veri
      const mNum = parti.match(/^(\d+)/);
      if (mNum) result.difetti = parseInt(mNum[1]);
      // NO DAC e Difetto Visivo = indicazioni
      const mNoDac = parti.match(/(\d+)\s*NO\s*DAC/i);
      if (mNoDac) result.indicazioni.push(`${mNoDac[1]} No DAC`);
      const mVisivo = parti.match(/(\d+)\s*Difetto\s*Visivo/i);
      if (mVisivo) result.indicazioni.push(`${mVisivo[1]} Difetto Visivo`);
      continue;
    }

    // Nota: ...
    const mNota = riga.match(/^Nota:\s*(.+)$/i);
    if (mNota) {
      result.note.push(mNota[1].trim());
      continue;
    }

    // Testo libero in fondo (ritardo, pioggia, ecc.)
    if (result.saldature > 0 && riga.length > 5) {
      result.note.push(riga);
    }
  }

  // Se nessun binario esplicito ma ci sono km, crea un binario generico
  if (result.binari.length === 0) {
    result.binari.push({ tipo: null, km_inizio: null, km_fine: null });
  }

  return result;
}

// POST /api/parse — solo parsing lista, non salva
router.post('/parse', (req, res) => {
  const { testo } = req.body;
  if (!testo) return res.status(400).json({ error: 'Testo obbligatorio' });
  res.json(parseListaSaldature(testo));
});

// POST /api/parse-riepilogo — parsing riepilogo WhatsApp, non salva
router.post('/parse-riepilogo', (req, res) => {
  const { testo } = req.body;
  if (!testo) return res.status(400).json({ error: 'Testo obbligatorio' });
  res.json(parseRiepilogo(testo));
});

// POST /api/cantieri/:cantiereId/log-notte — parse lista + salva
router.post('/cantieri/:cantiereId/log-notte', (req, res) => {
  const cantiere = db.prepare('SELECT id FROM cantieri WHERE id = ?').get(req.params.cantiereId);
  if (!cantiere) return res.status(404).json({ error: 'Cantiere non trovato' });

  const { testo, data, squadra, ultimo_km, note, posizione_link } = req.body;
  if (!testo || !data) return res.status(400).json({ error: 'Testo e data obbligatori' });

  const parsed = parseListaSaldature(testo);

  const salvaTutto = db.transaction(() => {
    let notte = db.prepare('SELECT * FROM notti WHERE cantiere_id = ? AND data = ?')
      .get(req.params.cantiereId, data);

    if (notte) {
      // Pulisci vecchi dati prima di re-inserire
      db.prepare('DELETE FROM difetti WHERE saldatura_id IN (SELECT id FROM saldature WHERE notte_id = ?)').run(notte.id);
      db.prepare('DELETE FROM saldature WHERE notte_id = ?').run(notte.id);
      db.prepare('UPDATE notti SET stato = ?, squadra = ?, note = ?, posizione_link = ?, num_saldature = ? WHERE id = ?')
        .run('completata', squadra || null, note || null, posizione_link || null, parsed.totale, notte.id);
    } else {
      const result = db.prepare(`
        INSERT INTO notti (cantiere_id, data, stato, squadra, note, posizione_link, num_saldature)
        VALUES (?, ?, 'completata', ?, ?, ?, ?)
      `).run(req.params.cantiereId, data, squadra || null, note || null, posizione_link || null, parsed.totale);
      notte = { id: result.lastInsertRowid };
    }

    const stmtSald = db.prepare(`
      INSERT INTO saldature (notte_id, cantiere_id, km, lato, tipo, stato, codice_difetto, note, raw_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const stmtDifetto = db.prepare(`
      INSERT INTO difetti (cantiere_id, saldatura_id, km, lato, codice, data_trovato)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const s of parsed.saldature) {
      const r = stmtSald.run(notte.id, req.params.cantiereId, s.km, s.lato, s.tipo,
                              s.stato, s.codice_difetto, s.note, s.raw_text);
      if (s.codice_difetto) {
        stmtDifetto.run(req.params.cantiereId, r.lastInsertRowid, s.km, s.lato, s.codice_difetto, data);
      }
    }

    if (ultimo_km) {
      db.prepare('UPDATE cantieri SET ultimo_km = ? WHERE id = ?').run(ultimo_km, req.params.cantiereId);
    }

    return notte.id;
  });

  const notteId = salvaTutto();
  res.status(201).json({ notte_id: notteId, ...parsed });
});

// POST /api/cantieri/:cantiereId/log-riepilogo — parse riepilogo WhatsApp + salva
router.post('/cantieri/:cantiereId/log-riepilogo', (req, res) => {
  const cantiere = db.prepare('SELECT id FROM cantieri WHERE id = ?').get(req.params.cantiereId);
  if (!cantiere) return res.status(404).json({ error: 'Cantiere non trovato' });

  const { testo, posizione_link } = req.body;
  if (!testo) return res.status(400).json({ error: 'Testo obbligatorio' });

  const parsed = parseRiepilogo(testo);
  if (!parsed.data) return res.status(400).json({ error: 'Data non trovata nel riepilogo' });

  const noteFinali = [];
  if (parsed.indicazioni.length > 0) noteFinali.push(parsed.indicazioni.join(', '));
  if (parsed.note.length > 0) noteFinali.push(parsed.note.join('. '));
  const noteStr = noteFinali.length > 0 ? noteFinali.join(' — ') : null;

  const salvaTutto = db.transaction(() => {
    let notte = db.prepare('SELECT * FROM notti WHERE cantiere_id = ? AND data = ?')
      .get(req.params.cantiereId, parsed.data);

    if (notte) {
      // Pulisci vecchi difetti di questa notte (solo quelli senza saldatura, da riepilogo)
      db.prepare('DELETE FROM difetti WHERE cantiere_id = ? AND data_trovato = ? AND saldatura_id IS NULL').run(req.params.cantiereId, parsed.data);
      db.prepare(`UPDATE notti SET stato = ?, squadra = ?, note = ?, posizione_link = ?,
        num_saldature = ?, km_inizio = ?, km_fine = ?, km_percorsi = ? WHERE id = ?`)
        .run('completata', parsed.squadra, noteStr, posizione_link || null,
             parsed.saldature, parsed.binari[0]?.km_inizio, parsed.binari[0]?.km_fine,
             parsed.km_percorsi, notte.id);
    } else {
      const result = db.prepare(`
        INSERT INTO notti (cantiere_id, data, stato, squadra, note, posizione_link,
          num_saldature, km_inizio, km_fine, km_percorsi)
        VALUES (?, ?, 'completata', ?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.cantiereId, parsed.data, parsed.squadra, noteStr,
             posizione_link || null, parsed.saldature,
             parsed.binari[0]?.km_inizio, parsed.binari[0]?.km_fine, parsed.km_percorsi);
      notte = { id: result.lastInsertRowid };
    }

    // Crea difetti senza km (da compilare a mano)
    if (parsed.difetti > 0) {
      const stmtDifetto = db.prepare(`
        INSERT INTO difetti (cantiere_id, km, lato, codice, data_trovato)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (let i = 0; i < parsed.difetti; i++) {
        stmtDifetto.run(req.params.cantiereId, 'da compilare', '', 'da verificare', parsed.data);
      }
    }

    // Aggiorna ultimo_km sui binari
    for (const b of parsed.binari) {
      if (b.km_fine && b.tipo) {
        const binario = db.prepare('SELECT id FROM binari WHERE cantiere_id = ? AND tipo = ?')
          .get(req.params.cantiereId, b.tipo);
        if (binario) {
          db.prepare('UPDATE binari SET ultimo_km = ? WHERE id = ?').run(b.km_fine, binario.id);
        }
      }
    }

    return notte.id;
  });

  const notteId = salvaTutto();
  res.status(201).json({ notte_id: notteId, parsed });
});

module.exports = router;

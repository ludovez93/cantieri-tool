# PLAN — Redesign Frontend (Mockup → Reale)

## Decisioni confermate
- Navbar in alto (3 tab): Dashboard / Panoramica / Log Notte
- Dettaglio: non è tab, si accede cliccando un cantiere (back button per tornare)
- Calendario mese: funzione JS riusabile `renderCalendar(container, notti, options)`
- CSS: sostituire style.css intero con quello del mockup
- Backend: quasi zero modifiche

---

## Fase 1 — Base (CSS + HTML shell + Calendario)

### 1.1 style.css → SOSTITUIRE
- Copiare tutto il CSS dal mockup demo-redesign.html
- Aggiungere stili navbar top (demo-nav adattato)
- Mantenere stili login esistenti (login non cambia)

### 1.2 index.html → MODIFICARE
- Rimuovere navbar bottom fixed
- Aggiungere navbar top dentro `.container`, sopra `#app`
- 3 tab: Dashboard / Panoramica / Log Notte
- Dettaglio e form-cantiere: navbar nascosta, back button nel header

### 1.3 calendar.js → NUOVO
```
renderCalendar(container, notti, options)
```
- `options.mode`: 'global' (celle = num notti + barre cantiere) | 'cantiere' (celle = num saldature)
- `options.mese`: 'YYYY-MM' (default mese corrente)
- `options.onMonthChange(mesePrecedente)`: callback per fetch dati nuovo mese
- `options.onCellClick(data, notti)`: callback opzionale
- Genera: header mese + frecce, weekdays, griglia 7 colonne, legenda, tooltip
- Stati cella: done, done-multi, skip, absent, today, future, nowork, empty
- Tooltip: fixed position, si chiude toccando altrove
- CSS già pronto nel mockup

---

## Fase 2 — Dashboard

### 2.1 dashboard.js → RISCRIVERE render
- **Header**: "Cantieri" label + "Nome · Gio 9 apr" + btn Esci
- **Hero "Stasera"**: filtra notti per data odierna
  - Se ci sono: "2 notti" + lista cantiere+orario
  - Se non ci sono: "Nessuna notte stasera" + prossima data
  - Dati: da `dashData.tutteNotti` filtrate per oggi
  - Orario: da `cantiere.orario_interruzione`
- **Calendario mese**: `renderCalendar(calDiv, notti, { mode: 'global' })`
  - Dati: `API.timeline(from, to)` per il mese corrente
  - Cambio mese: ri-fetch timeline
- **Lista cantieri**: card-row con:
  - Nome + dot giallo se difetti
  - Progress bar (saldature/stima o notti fatte/totali)
  - Badge OK/DIF/URG + deadline colorata (rosso <7g, arancione <14g, muted)
  - Click → `Router.navigate('cantiere', { id })`

### 2.2 Backend — Verifica
- `GET /api/timeline?from=2026-04-01&to=2026-04-30` → deve tornare notti con `num_saldature` e `cantiere_nome`
- Se manca `num_saldature` nel timeline: aggiungere al query (piccolo tweak)

---

## Fase 3 — Dettaglio cantiere

### 3.1 cantiere.js → RISCRIVERE render
- **Header**: back button + nome cantiere
- **Riga situazione**: una card con:
  - Riga principale: "4/10 notti | deadline tra 1g | 5 difetti"
  - Sub-riga: "Ultimo km: P: 168+200 · Notturno 22:30-05:00"
- **Calendario cantiere**: `renderCalendar(calDiv, notti, { mode: 'cantiere' })`
  - Celle mostrano num_saldature (non num notti)
- **Prossime notti + meteo inline**: lista verticale
  - Ogni riga: "Stasera 9→10/04" + "22:30-05:00" + "☀️ 18° 0mm"
  - Warning giallo se pioggia > 5mm
  - Max 3-5 prossime notti
- **Difetti aperti**: card con km grande + codice badge rosso
- **CTA "LOG NOTTE"** in fondo

### Logica JS che resta invariata:
- Fetch parallelo cantiere + binari + notti + difetti
- Coordinate meteo hardcoded per località
- Chiamata API.meteo()

---

## Fase 4 — Panoramica (NUOVA)

### 4.1 panoramica.js → NUOVO
- Registrare in Router
- **Header**: "Panoramica"
- **Calendario mese globale**: stesso componente della dashboard
- **Lista cantieri**: nome + deadline colorata + notti count + barra progress
- Dati: stessa fonte (timeline + dashboard cantieri)

---

## Fase 5 — Log Notte

### 5.1 log-notte.js → RITOCCHI HTML
- Toggle: da pill a underline gradient (solo cambio classi CSS)
- Result card: numero grande "5 saldature riconosciute" + difetti con badge
- CTA: classe `.btn-cta`
- **Funzionalità JS invariata** (parser, save, preview)

---

## Fase 6 — Router + App

### 6.1 router.js
- Registrare vista 'panoramica'
- Gestire visibilità navbar: mostra su dashboard/panoramica/log, nascondi su dettaglio/form/login

### 6.2 app.js
- Navbar: 3 tab (dashboard, panoramica, log)
- Click listener per ciascuno
- Highlight tab attivo

---

## File toccati (riepilogo)

| File | Azione | Complessità |
|------|--------|-------------|
| `frontend/css/style.css` | SOSTITUIRE | Bassa (copia da mockup) |
| `frontend/index.html` | MODIFICARE navbar | Bassa |
| `frontend/js/views/calendar.js` | NUOVO | Alta |
| `frontend/js/views/dashboard.js` | RISCRIVERE render | Alta |
| `frontend/js/views/cantiere.js` | RISCRIVERE render | Media |
| `frontend/js/views/panoramica.js` | NUOVO | Media |
| `frontend/js/views/log-notte.js` | RITOCCHI | Bassa |
| `frontend/js/router.js` | PICCOLE MODIFICHE | Bassa |
| `frontend/js/app.js` | PICCOLE MODIFICHE | Bassa |

## File NON toccati
- backend/* (zero)
- frontend/js/api.js
- frontend/js/utils.js
- frontend/js/views/login.js
- frontend/js/views/form-cantiere.js

## Ordine esecuzione
1. style.css
2. index.html
3. calendar.js
4. dashboard.js
5. cantiere.js
6. panoramica.js
7. log-notte.js
8. router.js + app.js
9. Deploy su server + test

## Rischi
- Il calendario è il pezzo più complesso: gestione mesi, stati cella, tooltip
- Tocco l'HTML dentro i file JS: se sbaglio un backtick la view si rompe
- Mitigazione: deploy e test dopo ogni file

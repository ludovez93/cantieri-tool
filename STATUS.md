# STATUS — Cantieri Tool

## Stato: REDESIGN LIVE — Server 92.4.172.126:3001

## Sessione 9/4/2026 (notte 3) — Redesign + Audit Fix

### Cosa fatto
- Implementato redesign completo dal mockup nei file reali (9 file)
- **Nuovi file**: calendar.js (componente riusabile), panoramica.js (nuova vista)
- **Riscritti**: dashboard.js, cantiere.js, log-notte.js, style.css, index.html, router.js, app.js
- **api.js**: aggiunto API.timeline()
- **Backend**: aggiunto fallback num_saldature in timeline, 6 indici DB

### Audit fix applicati
1. CSS form-cantiere: aggiunte classi .switch, .card, .badge, .section mancanti
2. Timezone bug: toISOString() → date locale ovunque (4 file)
3. Progress bar dashboard: usa notti reali programmate, non formula inventata
4. Indici DB: notti(cantiere_id,data), saldature(notte_id), difetti(cantiere_id,risolto)
5. Timeline fallback COUNT per num_saldature=0
6. Navbar active state: aggiorna solo quando visibile
7. Bottone Salva disabilitato fino ad Analizza
8. Panoramica deadline: classi CSS coerenti con dashboard
9. Script defer per caricamento più veloce su mobile
10. Font h1: Syne→Space Grotesk (discendenti tagliati)
11. Testi piccoli: text-muted/secondary più chiari, font-size alzati

### Prossimo step
- Test su iPhone da campo stanotte (leggibilità, touch, scroll)
- Verificare form-cantiere con switch urgente su mobile
- Testare tooltip calendario su mobile (posizionamento)

### Note tecniche
- Server: porta 3001, nginx proxy su /cantieri/
- DB: ~/cantieri-tool/backend/cantieri.db (SQLite WAL + 6 indici)
- PM2 process: "cantieri-tool"
- Tunnel SSH: `ssh -i "C:/Users/Utente/Desktop/claude/server-2/ssh-key.key" -f -N -L 3001:localhost:3001 opc@92.4.172.126`

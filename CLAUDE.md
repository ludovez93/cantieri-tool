# Cantieri Tool — PWA Gestione Operativa Cantieri

## Cosa è
PWA per pianificazione e gestione multi-cantiere di controllo ultrasonoro (secondo livello)
su tratte ferroviarie in rinnovo/risanamento.

## Stack previsto
- Frontend: PWA (HTML/CSS/JS)
- Backend: Server Oracle (92.4.172.126)
- Database: da definire (probabilmente SQLite o Redis, già presente sul server)

## Utenti
- Più persone (Ludovico, Cristopher, colleghi)
- Accesso da iPhone, Android, PC
- Niente login complessi — PIN o link diretto

## File di riferimento
- STATUS.md — stato corrente del progetto
- LEARNED.md — lezioni apprese
- PLAN.md — piano tecnico (da creare dopo raccolta requisiti)
- Parsing saldature: riusare logica da M2 Tool v2 (C:/Users/Utente/Desktop/claude/m2-tool-repo/)

## Regole
- Non sviluppare nulla senza PLAN.md approvato
- Inserimento dati manuale, niente parsing automatico PDF
- Semplicità assoluta: deve essere usabile di notte sul campo da telefono

## DESIGN SYSTEM — 2026 AESTHETIC

Questo progetto deve avere una grafica di livello professionale,
distintiva e moderna. NON voglio l'estetica generica AI.

### DIVIETI ASSOLUTI
- Font: MAI Inter, Roboto, Arial, system fonts
- Colori: MAI sfondo bianco con gradienti viola
- MAI layout prevedibili e componenti cookie-cutter
- MAI design piatto e senz'anima

### ESTETICA TARGET — 2026
- **Dark mode** come default, con profondità e layering
- **Glassmorphism responsabile**: superfici traslucide, blur,
  gerarchia visiva — mai sacrificare leggibilità
- **Tipografia espressiva**: usa font con personalità
  (JetBrains Mono, Space Grotesk, IBM Plex, Clash Display)
  Contrasto estremo tra pesi: 200 vs 800, mai 400 vs 600
- **Colori**: palette scura con accenti neon o metallici,
  alto contrasto, non pastelli spenti
- **Bento grid**: card modulari, bordi arrotondati,
  spaziature generose
- **Micro-interazioni**: hover states fluidi, transizioni
  150–300ms, feedback visivo su ogni azione
- **Texture e profondità**: no flat puro, elementi con
  soft shadows, senso di z-index reale

### REGOLA GENERALE
Interpreta creativamente. Fai scelte inaspettate che sembrino
progettate apposta per questo contesto. Il risultato finale deve
sembrare fatto da un designer senior, non da uno script.
Don't hold back. Give it your all.

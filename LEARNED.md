# LEARNED — Cantieri Tool

## Tecnico — Deploy
- better-sqlite3 non compila su Windows senza Visual Studio C++ toolset → installare direttamente sul server Linux
- Deploy via scp (no git sul server)
- Nginx Docker + reverse proxy: usare 172.17.0.1 come host gateway per raggiungere processi host da dentro container
- Path frontend: usare SEMPRE path relativi (senza /) per compatibilità con reverse proxy su sub-path
- API base path: calcolare dinamicamente da window.location.pathname per funzionare sia a root che dietro proxy
- PM2 restart: il backend impiega ~1s per essere pronto, curl immediato dopo restart dà 502
- Porta 3001 non aperta nella security list OCI, usare nginx reverse proxy su porta 80 già aperta

## Design
- **Syne font**: usare SOLO per titoli (h1, brand) a weight 700 max. Mai per body text — a weight 800+ diventa illeggibile/stirato
- **No numeri ridondanti**: se il calendario mostra già notti/saldature, non ripetere le stesse info in un ticker sopra
- **Hero dashboard deve essere azionabile**: "Stasera: 2 notti" > "6 attivi / 221 sald" — mostra cosa fare ORA, non stats generiche
- **Dettaglio cantiere = una riga di contesto + calendario + problemi**: no sezioni separate per ogni dato
- **Meteo va dentro le prossime notti**, non come sezione separata — il meteo serve per decidere se si lavora, mostralo nel contesto
- **Mockup prima, codice dopo**: creare demo HTML standalone, pubblicare su GitHub Pages, validare da mobile, poi implementare
- Non fare redesign a pezzi: l'utente preferisce iterare gradualmente, un pezzo alla volta
- Il flusso principale è il log notte (incolla→salva), tutto il resto è secondario
- Il calendario serve ma deve essere semplice: cosa fatto + cosa fare, tipo agenda
- La timeline griglia settimanale è confusionaria su mobile — meglio lista verticale per data
- Form cantiere complesso non serve: i cantieri nuovi li crea Claude da conversazione
- Troppa roba nella stessa pagina = confusionario. Meglio pulito con poche info chiare
- Pari/dispari vanno dentro lo stesso cantiere come "binari", non come cantieri separati
- Giorni attivi per cantiere (es. dom-ven) → genera notti solo su quei giorni
- Le notti si generano automaticamente quando si impostano data_inizio e data_fine
- **SEGUIRE SEMPRE il design system del CLAUDE.md** — glassmorphism, font espressivi, profondità. Mai grafica generica/piatta

## Dominio
- Il secondo livello = controllo ultrasonoro saldature, ultima lavorazione prima della riconsegna
- Le macchine di rinnovo avanzano X km a notte, il secondo livello segue dopo
- Le interruzioni sono quasi sempre notturne
- Se salta una notte (maltempo, problemi) tutto scala di un giorno
- Urgenze: es. le regolazioni partono dopo il secondo livello, se non finisci in tempo blocchi la catena
- Ogni cantiere ha il suo formato PDF dalla ditta — non esiste formato unico
- I dati arrivano spesso a voce, non sempre da file
- Squadre: 2 persone + 1 furgone, oppure 4+2 o 2+2 divisi per cantiere
- Niente mezzi ferroviari, solo furgoni stradali
- **Notte = a cavallo**: iniziano la sera (es. 23) e finiscono la mattina dopo (24). Mostrare come "23→24/03"
- **Saltata ≠ Assente**: saltata = c'eravamo ma non si è lavorato (pioggia, mezzi). Assente = non eravamo lì quel giorno
- **NO DAC e Difetto Visivo sono indicazioni, NON difetti** — vanno nelle note
- **Difetti da riepilogo**: non hanno km preciso, da compilare a mano dopo
- **Formato riepilogo WhatsApp**: ordine righe variabile, a volte 2 binari nella stessa notte, km a volte su una riga sola

## Onestà nei piani
- Quando scrivi un PLAN.md, distingui CHIARAMENTE cosa cambia davvero vs cosa c'è già
- Non riscrivere le stesse spec con parole diverse spacciandole per novità
- L'utente vuole sapere il delta reale, non un documento che sembra grande ma è 70% status quo

## Tecnico
- I PDF non vanno parsati automaticamente — inserimento manuale è più affidabile
- Dal PDF si estraggono: km inizio, km fine, totale tratta (dati fissi)
- L'avanzamento (dove sono le macchine, dove siete voi) si aggiorna a mano
- Parsing liste saldature: RIUSARE la logica di M2 Tool v2 (riconosce vari formati + difetti)
- Il numero totale di saldature di un cantiere raramente è noto — contare solo quelle fatte
- Ritmo medio: 40-50 saldature/notte, ma la distanza in km varia (stazione vs linea)
- La stima notti restanti non può essere precisa — mostrare solo il ritmo medio
- Brescia-Verona è nuova costruzione: si lavora di giorno, non serve interruzione
- I dati li inseriscono più persone (non solo Ludovico) — UI deve essere semplice per tutti
- **Parser: righe doppie attaccate** — WhatsApp a volte manda 2 saldature su una riga senza a-capo. Il parser deve splittarle
- **Open-Meteo ICON-EU**: non supporta precipitation_probability_max (restituisce null), usare precipitation_sum in mm
- **Weathercode**: 80-82 = pioggia a rovesci (non neve), 85-86 = neve. Il vecchio mapping era sbagliato
- **Dashboard deve usare API.dashboard()** non API.listaCantieri() — altrimenti mancano le stats aggregate
- **Font Syne taglia i discendenti** (g, p, y) su h1 — usare Space Grotesk per titoli grandi, Syne solo per label uppercase piccole
- **text-muted #464d5e troppo scuro** su sfondo nero — alzato a #6b7388, text-secondary a #9aa3b8
- **Font-size sotto 0.65rem illeggibile** su mobile — minimo 0.65rem per label, 0.7rem per testo leggibile
- **Anti-sdoppiamento**: quando si re-inserisce la stessa notte, cancellare prima vecchie saldature e difetti

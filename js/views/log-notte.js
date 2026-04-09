// Log Notte View — Lista saldature + Riepilogo (Redesign)
Router.register('log-notte', async (params) => {
  let cantieri = [];
  let selectedId = params.cantiereId || null;

  cantieri = await API.listaCantieri();
  if (!cantieri) return '';

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const mode = params.mode || 'lista';

  return `
    <div class="page-header anim d1">
      <button class="back-btn" onclick="App.navigate(${selectedId ? "'cantiere', {id:" + selectedId + "}" : "'dashboard'"})">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1>Log Notte</h1>
    </div>

    <div class="toggle-bar anim d2">
      <button class="toggle-btn ${mode === 'lista' ? 'active' : ''}" id="mode-lista">Lista saldature</button>
      <button class="toggle-btn ${mode === 'riepilogo' ? 'active' : ''}" id="mode-riepilogo">Riepilogo</button>
    </div>

    <div id="mode-lista-view" class="${mode !== 'lista' ? 'hidden' : ''}">
      <div class="input-group anim d3">
        <label>Cantiere</label>
        <select id="log-cantiere">
          <option value="">Seleziona cantiere...</option>
          ${cantieri.map(c => `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}
        </select>
      </div>

      <div class="input-group anim d4">
        <label>Data notte</label>
        <input type="date" id="log-data" value="${today}">
      </div>

      <div class="input-group anim d5">
        <label>Incolla lista saldature</label>
        <textarea id="log-testo" placeholder="Incolla qui la lista dal WhatsApp...&#10;&#10;Es:&#10;165+640 SX&#10;166+132 DX 4112&#10;167+200 DX ALL"></textarea>
      </div>

      <button class="btn-cta anim d6" id="btn-analizza" style="margin-bottom:16px;background:none;border:1px solid var(--border-light);color:var(--text-secondary);box-shadow:none;font-size:0.8rem">ANALIZZA</button>

      <div id="parse-result" class="hidden"></div>

      <div id="save-section" class="hidden">
        <div class="input-group">
          <label>Squadra</label>
          <input type="text" id="log-squadra" placeholder="Es: Ludo+Cri">
        </div>
        <div class="input-group">
          <label>Ultimo km raggiunto</label>
          <input type="text" id="log-ultimo-km" placeholder="Es: 168+200" style="font-family:var(--font-mono)">
        </div>
        <div class="input-group">
          <label>Link posizione</label>
          <input type="text" id="log-posizione" placeholder="Incolla link Google Maps">
        </div>
        <div class="input-group">
          <label>Note</label>
          <input type="text" id="log-note" placeholder="Opzionale">
        </div>
        <button class="btn-cta" id="btn-salva" disabled>SALVA NOTTE</button>
      </div>
    </div>

    <div id="mode-riepilogo-view" class="${mode !== 'riepilogo' ? 'hidden' : ''}">
      <div class="input-group anim d3">
        <label>Cantiere</label>
        <select id="log-cantiere-r">
          <option value="">Seleziona cantiere...</option>
          ${cantieri.map(c => `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}
        </select>
      </div>

      <div class="input-group anim d4">
        <label>Incolla riepilogo WhatsApp</label>
        <textarea id="log-testo-r" placeholder="Incolla qui il riepilogo...&#10;&#10;Es:&#10;Cantiere 21/26&#10;Notte 23-24/03/2026&#10;Linea: Empoli-San Miniato&#10;Da Km: 39+100&#10;a Km: 37+200&#10;Operatori: CA LP&#10;Binario: Dispari&#10;1.9&#10;Saldature controllate: 40&#10;Saldature difettose: 0"></textarea>
      </div>

      <button class="btn-cta anim d5" id="btn-analizza-r" style="margin-bottom:16px;background:none;border:1px solid var(--border-light);color:var(--text-secondary);box-shadow:none;font-size:0.8rem">ANALIZZA</button>

      <div id="parse-result-r" class="hidden"></div>

      <div id="save-section-r" class="hidden">
        <div class="input-group">
          <label>Link posizione</label>
          <input type="text" id="log-posizione-r" placeholder="Incolla link Google Maps">
        </div>
        <button class="btn-cta" id="btn-salva-r" disabled>SALVA NOTTE</button>
      </div>
    </div>
  `;
});

Router.register('log-notte_init', (params) => {
  let parseData = null;
  let parseDataR = null;

  // Toggle mode
  document.getElementById('mode-lista').addEventListener('click', () => {
    document.getElementById('mode-lista-view').classList.remove('hidden');
    document.getElementById('mode-riepilogo-view').classList.add('hidden');
    document.getElementById('mode-lista').classList.add('active');
    document.getElementById('mode-riepilogo').classList.remove('active');
  });

  document.getElementById('mode-riepilogo').addEventListener('click', () => {
    document.getElementById('mode-riepilogo-view').classList.remove('hidden');
    document.getElementById('mode-lista-view').classList.add('hidden');
    document.getElementById('mode-riepilogo').classList.add('active');
    document.getElementById('mode-lista').classList.remove('active');
  });

  // === LISTA SALDATURE ===
  document.getElementById('btn-analizza').addEventListener('click', async () => {
    const testo = document.getElementById('log-testo').value.trim();
    if (!testo) { App.toast('Incolla prima la lista', 'error'); return; }

    try {
      parseData = await API.parseSaldature(testo);
      const resultDiv = document.getElementById('parse-result');
      resultDiv.classList.remove('hidden');

      resultDiv.innerHTML = `
        <div class="result-card">
          <div class="result-big">
            <div class="result-big-num">${parseData.totale}</div>
            <div class="result-big-label">saldature riconosciute</div>
          </div>
          ${parseData.difetti_count > 0 ? `
            <div class="result-row" style="color:var(--red)">\uD83D\uDD34 <strong>${parseData.difetti_count}</strong>&nbsp;difett${parseData.difetti_count === 1 ? 'o' : 'i'} trovat${parseData.difetti_count === 1 ? 'o' : 'i'}:</div>
            ${parseData.difetti.map(d => `
              <div style="padding-left:28px;font-family:var(--font-mono);font-size:0.85rem;color:var(--text-secondary);padding:4px 0">
                ${esc(d.km)} ${esc(d.lato)} ${d.codice ? '\u2014 cod. ' + esc(d.codice) : ''} ${d.stato === 'nodac' ? '(NO DAC)' : ''}
              </div>
            `).join('')}
          ` : '<div class="result-row" style="color:var(--green)">\u2705 Nessun difetto</div>'}
          ${parseData.ignorate > 0 ? `
            <div class="result-row" style="color:var(--yellow)">\u26A0\uFE0F ${parseData.ignorate} righe ignorate</div>
          ` : ''}
        </div>
      `;

      document.getElementById('save-section').classList.remove('hidden');
      document.getElementById('btn-salva').disabled = false;

      if (parseData.data) {
        document.getElementById('log-data').value = parseData.data;
      }

      if (parseData.saldature.length > 0) {
        const last = parseData.saldature[parseData.saldature.length - 1];
        document.getElementById('log-ultimo-km').value = last.km;
      }
    } catch (e) {
      App.toast('Errore parsing: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-salva').addEventListener('click', async () => {
    if (!parseData) { App.toast('Analizza prima la lista', 'error'); return; }

    const cantiereId = document.getElementById('log-cantiere').value;
    if (!cantiereId) { App.toast('Seleziona un cantiere', 'error'); return; }

    const btn = disableBtn('btn-salva');
    const data = document.getElementById('log-data').value;
    const testo = document.getElementById('log-testo').value.trim();
    const squadra = document.getElementById('log-squadra').value.trim();
    const ultimo_km = document.getElementById('log-ultimo-km').value.trim();
    const posizione_link = document.getElementById('log-posizione').value.trim();
    const note = document.getElementById('log-note').value.trim();

    try {
      await API.logNotte(cantiereId, { testo, data, squadra, ultimo_km, posizione_link, note });
      App.toast(`Notte salvata: ${parseData.totale} saldature`, 'success');
      App.navigate('cantiere', { id: cantiereId });
    } catch (e) {
      enableBtn('btn-salva');
      App.toast('Errore salvataggio: ' + e.message, 'error');
    }
  });

  // === RIEPILOGO ===
  document.getElementById('btn-analizza-r').addEventListener('click', async () => {
    const testo = document.getElementById('log-testo-r').value.trim();
    if (!testo) { App.toast('Incolla prima il riepilogo', 'error'); return; }

    try {
      parseDataR = await API.parseRiepilogo(testo);
      const resultDiv = document.getElementById('parse-result-r');
      resultDiv.classList.remove('hidden');

      const binariStr = parseDataR.binari
        .filter(b => b.tipo)
        .map(b => `${b.tipo}${b.km_inizio ? ': ' + b.km_inizio + ' \u2192 ' + b.km_fine : ''}`)
        .join(' + ');

      resultDiv.innerHTML = `
        <div class="result-card">
          <div class="result-big">
            <div class="result-big-num">${parseDataR.saldature}</div>
            <div class="result-big-label">saldature</div>
          </div>
          ${parseDataR.linea ? `<div class="result-row"><strong>Linea:</strong>&nbsp;${esc(parseDataR.linea)}</div>` : ''}
          ${parseDataR.data ? `<div class="result-row"><strong>Data:</strong>&nbsp;${esc(parseDataR.data)}</div>` : ''}
          ${parseDataR.squadra ? `<div class="result-row"><strong>Squadra:</strong>&nbsp;${esc(parseDataR.squadra)}</div>` : ''}
          ${binariStr ? `<div class="result-row"><strong>Binari:</strong>&nbsp;${esc(binariStr)}</div>` : ''}
          ${parseDataR.km_percorsi ? `<div class="result-row"><strong>Km percorsi:</strong>&nbsp;${parseDataR.km_percorsi}</div>` : ''}
          ${parseDataR.difetti > 0 ? `
            <div class="result-row" style="color:var(--red)">\uD83D\uDD34 <strong>${parseDataR.difetti}</strong>&nbsp;difetti (km da compilare a mano)</div>
          ` : '<div class="result-row" style="color:var(--green)">\u2705 Nessun difetto</div>'}
          ${parseDataR.indicazioni.length > 0 ? `
            <div class="result-row" style="color:var(--text-secondary)">\u2139\uFE0F ${esc(parseDataR.indicazioni.join(', '))}</div>
          ` : ''}
          ${parseDataR.note.length > 0 ? `
            <div class="result-row" style="color:var(--yellow)">\uD83D\uDCDD ${esc(parseDataR.note.join('. '))}</div>
          ` : ''}
          ${parseDataR.notte_numero ? `
            <div class="result-row" style="color:var(--text-muted);font-size:0.8rem">Notte ${parseDataR.notte_numero}/${parseDataR.notte_totale}</div>
          ` : ''}
        </div>
      `;

      document.getElementById('save-section-r').classList.remove('hidden');
      document.getElementById('btn-salva-r').disabled = false;
    } catch (e) {
      App.toast('Errore parsing: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-salva-r').addEventListener('click', async () => {
    if (!parseDataR) { App.toast('Analizza prima il riepilogo', 'error'); return; }

    const cantiereId = document.getElementById('log-cantiere-r').value;
    if (!cantiereId) { App.toast('Seleziona un cantiere', 'error'); return; }

    const btn = disableBtn('btn-salva-r');
    const testo = document.getElementById('log-testo-r').value.trim();
    const posizione_link = document.getElementById('log-posizione-r').value.trim();

    try {
      await API.logRiepilogo(cantiereId, { testo, posizione_link });
      App.toast(`Notte salvata: ${parseDataR.saldature} saldature`, 'success');
      App.navigate('cantiere', { id: cantiereId });
    } catch (e) {
      enableBtn('btn-salva-r');
      App.toast('Errore salvataggio: ' + e.message, 'error');
    }
  });
});

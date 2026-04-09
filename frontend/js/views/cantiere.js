// Cantiere Detail View — Redesign

const COORDS = {
  'la spezia': { lat: 44.1, lon: 9.8 },
  'empoli': { lat: 43.7, lon: 10.9 },
  'genova': { lat: 44.4, lon: 8.9 },
  'brescia': { lat: 45.5, lon: 10.2 },
  'merano': { lat: 46.7, lon: 11.2 },
  'chiusi': { lat: 43.0, lon: 11.9 },
};

function getCoords(nome) {
  const n = nome.toLowerCase();
  for (const [key, val] of Object.entries(COORDS)) {
    if (n.includes(key)) return val;
  }
  return { lat: 44.5, lon: 11.0 };
}

function meteoIcon(code) {
  if (code <= 1) return '\u2600\uFE0F';
  if (code <= 3) return '\u26C5';
  if (code <= 48) return '\uD83C\uDF2B\uFE0F';
  if (code <= 67) return '\uD83C\uDF27\uFE0F';
  if (code <= 77) return '\u2744\uFE0F';
  if (code <= 82) return '\uD83C\uDF27\uFE0F';
  if (code <= 86) return '\u2744\uFE0F';
  if (code <= 99) return '\u26C8\uFE0F';
  return '\u26C5';
}

const GIORNI_CANT = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

function formatDateCant(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)}/${parseInt(m)}`;
}

function formatNotte(d) {
  if (!d) return '';
  const dt1 = new Date(d + 'T12:00:00');
  const dt2 = new Date(dt1);
  dt2.setDate(dt2.getDate() + 1);
  const g1 = dt1.getDate();
  const g2 = dt2.getDate();
  const m1 = String(dt1.getMonth() + 1).padStart(2, '0');
  const m2 = String(dt2.getMonth() + 1).padStart(2, '0');
  if (m1 === m2) return `${g1}\u2192${g2}/${m1}`;
  return `${g1}/${m1}\u2192${g2}/${m2}`;
}

function formatNotteFull(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return `${GIORNI_CANT[dt.getDay()]} ${formatNotte(d)}`;
}

let _cantCalNotti = null;
let _cantCalMese = null;
let _cantCalId = null;

Router.register('cantiere', async (params) => {
  const [cantiere, binari, notti, difetti] = await Promise.all([
    API.getCantiere(params.id),
    API.listaBinari(params.id),
    API.listaNotti(params.id),
    API.listaDifetti(params.id)
  ]);

  if (!cantiere) return '<div class="empty-state"><p>Cantiere non trovato</p></div>';

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const oggi = new Date();

  // Stats
  const nottiCompletate = notti.filter(n => n.stato === 'completata');
  const nottiTotali = notti.length;
  const totSaldature = nottiCompletate.reduce((acc, n) => acc + (n.num_saldature || 0), 0);
  const difettiAperti = difetti.filter(d => !d.risolto);
  const difettiRisolti = difetti.filter(d => d.risolto);

  // Ultimo km dai binari
  const ultimiKm = binari.filter(b => b.ultimo_km).map(b => `${b.tipo[0].toUpperCase()}: ${b.ultimo_km}`).join(' \u00B7 ');

  // Deadline
  let deadlineText = '';
  let deadlineClass = '';
  if (cantiere.data_fine) {
    const dl = new Date(cantiere.data_fine + 'T00:00:00');
    const diff = Math.ceil((dl - new Date(today + 'T00:00:00')) / (1000*60*60*24));
    if (diff < 0) { deadlineText = 'scaduto'; deadlineClass = 'ds-red'; }
    else if (diff <= 7) { deadlineText = `tra ${diff}g`; deadlineClass = 'ds-red'; }
    else if (diff <= 14) { deadlineText = `tra ${diff}g`; deadlineClass = 'ds-yellow'; }
    else { deadlineText = `tra ${diff}g`; deadlineClass = 'ds-dim'; }
  }

  // Prossime notti (programmate future)
  const nottiFuture = notti.filter(n => n.data >= today && n.stato === 'programmata').slice(0, 5);

  // Meteo
  const coords = getCoords(cantiere.nome);
  let meteoData = null;
  try {
    const m = await API.meteo(coords.lat, coords.lon);
    if (m?.previsioni) meteoData = m.previsioni;
  } catch (e) { /* skip */ }

  // Prossime notti + meteo inline
  let prosNotti = '';
  if (nottiFuture.length > 0) {
    prosNotti = nottiFuture.map(n => {
      const isStasera = n.data === today;
      const label = isStasera ? `Stasera ${formatNotte(n.data)}` : formatNotteFull(n.data);
      const orario = cantiere.orario_interruzione || '';

      // Trova meteo per questa data
      let meteoStr = '';
      let isRain = false;
      if (meteoData) {
        const mp = meteoData.find(p => p.data === n.data);
        if (mp) {
          isRain = mp.pioggia_mm >= 5;
          const rainStr = mp.pioggia_mm > 0
            ? `<span style="color:${isRain ? 'var(--yellow)' : 'var(--text-muted)'};font-size:0.7rem;${isRain ? 'font-weight:600' : ''}">${mp.pioggia_mm}mm</span>`
            : `<span style="color:var(--text-muted);font-size:0.7rem">0mm</span>`;
          meteoStr = `${meteoIcon(mp.codice_meteo)} ${Math.round(mp.temp_max)}\u00B0 ${rainStr}`;
        }
      }

      return `
        <div class="next-night ${isRain ? 'next-night-warn' : ''}">
          <div class="nn-left">
            <div class="nn-date">${esc(label)}</div>
            <div class="nn-sub">${esc(orario)}</div>
          </div>
          <div class="nn-meteo">${meteoStr}</div>
        </div>
      `;
    }).join('');
  }

  // Difetti HTML
  let difettiHtml = '';
  if (difettiAperti.length > 0) {
    difettiHtml = `
      <div class="section-label anim d5">Difetti aperti (${difettiAperti.length})</div>
      <div class="anim d5 mb24">
        ${difettiAperti.map(d => `
          <div class="difetto-card">
            <div>
              <div class="dif-km">${esc(d.km)} ${esc(d.lato || '')}</div>
              <div class="dif-meta">${formatDateCant(d.data_trovato)}</div>
            </div>
            <div class="dif-actions">
              <span class="dif-badge">${esc(d.codice)}</span>
              <button class="btn-small" onclick="event.stopPropagation(); risolveDifetto(${d.id})" style="margin-left:8px">Risolto</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Difetti risolti
  let difRisoltiHtml = '';
  if (difettiRisolti.length > 0) {
    difRisoltiHtml = `
      <details style="margin-top:8px">
        <summary style="color:var(--text-muted);font-size:0.8rem;cursor:pointer">Difetti risolti (${difettiRisolti.length})</summary>
        ${difettiRisolti.map(d => `
          <div class="difetto-card" style="opacity:0.5;margin-top:8px">
            <div><div class="dif-km">${esc(d.km)} ${esc(d.lato || '')}</div><div class="dif-meta">Risolto ${formatDateCant(d.data_risolto)}</div></div>
            <span class="dif-badge" style="opacity:0.5">${esc(d.codice)}</span>
          </div>
        `).join('')}
      </details>
    `;
  }

  // Salva per calendario
  _cantCalNotti = notti;
  _cantCalMese = `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,'0')}`;
  _cantCalId = params.id;

  return `
    <div class="page-header anim d1">
      <button class="back-btn" onclick="App.navigate('dashboard')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1>${esc(cantiere.nome)}</h1>
      <button class="btn-small" onclick="App.navigate('form-cantiere', {id: ${cantiere.id}})">Edit</button>
    </div>

    <div class="detail-status anim d2">
      <div class="detail-status-row">
        <span class="ds-item"><span class="ds-val ds-green">${nottiCompletate.length}</span>/<span class="ds-dim">${nottiTotali}</span> notti</span>
        <span class="ds-sep"></span>
        ${deadlineText ? `<span class="ds-item">deadline <span class="ds-val ${deadlineClass}">${deadlineText}</span></span><span class="ds-sep"></span>` : ''}
        <span class="ds-item"><span class="ds-val ${difettiAperti.length > 0 ? 'ds-red' : 'ds-green'}">${difettiAperti.length}</span> difetti</span>
        ${totSaldature > 0 ? `<span class="ds-sep"></span><span class="ds-item"><span class="ds-val ds-cyan">${totSaldature}</span> sald.</span>` : ''}
      </div>
      <div class="detail-status-sub">
        ${ultimiKm ? `Ultimo km: <strong>${esc(ultimiKm)}</strong> &middot; ` : ''}${cantiere.tipo === 'diurno' ? 'Diurno' : 'Notturno'}${cantiere.orario_interruzione ? ' ' + esc(cantiere.orario_interruzione) : ''}
      </div>
    </div>

    <div class="anim d3 mb24" id="cant-calendar"></div>

    ${nottiFuture.length > 0 ? `
      <div class="section-label anim d4">Prossime notti</div>
      <div class="anim d4 mb24">${prosNotti}</div>
    ` : ''}

    ${difettiHtml}

    ${difRisoltiHtml}

    <button class="btn-cta anim d6" onclick="App.navigate('log-notte', {cantiereId: ${cantiere.id}})" style="margin-top:16px">LOG NOTTE</button>
  `;
});

Router.register('cantiere_init', async (params) => {
  // Calendario cantiere
  const calDiv = document.getElementById('cant-calendar');
  if (calDiv && _cantCalNotti) {
    renderCantCalendar(_cantCalMese);
  }

  // Risolvi difetto
  window.risolveDifetto = async (id) => {
    try {
      await API.aggiornaDifetto(id, { risolto: true });
      App.toast('Difetto segnato come risolto', 'success');
      App.navigate('cantiere', params);
    } catch (e) {
      App.toast('Errore: ' + e.message, 'error');
    }
  };
});

async function renderCantCalendar(mese) {
  const calDiv = document.getElementById('cant-calendar');
  if (!calDiv) return;

  // Per il calendario cantiere, le notti sono già tutte caricate
  // Filtriamo solo per il mese richiesto nel renderCalendar
  renderCalendar(calDiv, _cantCalNotti, {
    mode: 'cantiere',
    mese: mese,
    onMonthChange: (nuovoMese) => renderCantCalendar(nuovoMese)
  });
}

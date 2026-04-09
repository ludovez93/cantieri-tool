// Dashboard View — Redesign

let _dashCalNotti = null; // cache notti per calendario
let _dashCalMese = null;

Router.register('dashboard', async () => {
  const dashData = await API.dashboard();
  if (!dashData) return '';
  const cantieri = dashData.cantieri || [];
  const tutteNotti = dashData.tutteNotti || [];

  const utente = API.getUtente();
  const oggi = new Date();
  const GIORNI = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const MESI = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
  const dataOggi = `${GIORNI[oggi.getDay()]} ${oggi.getDate()} ${MESI[oggi.getMonth()]}`;
  const oggiStr = `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,'0')}-${String(oggi.getDate()).padStart(2,'0')}`;

  // Notti di stasera
  const nottiStasera = tutteNotti.filter(n => n.data === oggiStr && n.stato === 'programmata');
  // Se nessuna programmata, cerca la prossima
  let prossimaData = null;
  if (nottiStasera.length === 0) {
    const prossima = tutteNotti.find(n => n.data > oggiStr && n.stato === 'programmata');
    if (prossima) prossimaData = prossima.data;
  }

  // Orari per cantiere
  const orariMap = {};
  cantieri.forEach(c => { orariMap[c.id] = c.orario_interruzione || ''; });

  // Hero stasera
  let heroHtml = '';
  if (nottiStasera.length > 0) {
    heroHtml = `
      <div class="hero-tonight anim d2">
        <div class="hero-tonight-label">Stasera</div>
        <div class="hero-tonight-count">${nottiStasera.length} <span class="hero-tonight-count-label">nott${nottiStasera.length === 1 ? 'e' : 'i'}</span></div>
        <div class="hero-tonight-list">
          ${nottiStasera.map(n => `
            <div class="hero-tonight-item">
              <span class="hero-tonight-name">${esc(n.nome)}</span>
              <span class="hero-tonight-time">${esc(orariMap[n.cantiere_id] || '').split('-')[0] || ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    heroHtml = `
      <div class="hero-tonight anim d2">
        <div class="hero-tonight-label">Stasera</div>
        <div class="hero-tonight-count" style="font-size:1.2rem;color:var(--text-muted)">Nessuna notte</div>
        ${prossimaData ? `<div class="hero-tonight-next">Prossima: <strong>${formatDashDate(prossimaData)}</strong></div>` : ''}
      </div>
    `;
  }

  // Conta notti totali per cantiere da tutteNotti
  const nottiPerCantiere = {};
  tutteNotti.forEach(n => {
    if (!nottiPerCantiere[n.cantiere_id]) nottiPerCantiere[n.cantiere_id] = 0;
    nottiPerCantiere[n.cantiere_id]++;
  });

  // Lista cantieri
  let listaHtml = '';
  if (cantieri.length > 0) {
    listaHtml = `<div class="cantieri-list">
      ${cantieri.map((c, i) => {
        const deadlineInfo = calcDeadline(c.data_fine);
        const hasDifetti = c.difetti_aperti > 0;
        const cardClass = hasDifetti ? 'card-row-difetti' : '';
        const badge = c.urgente ? '<span class="cr-badge cr-badge-urg">URG</span>' :
                      hasDifetti ? `<span class="cr-badge cr-badge-dif">${c.difetti_aperti} DIF</span>` :
                      '<span class="cr-badge cr-badge-ok">OK</span>';
        const nottiTot = nottiPerCantiere[c.id] || 0;
        const progressPct = nottiTot > 0 ? Math.min(100, Math.round((c.notti_completate / nottiTot) * 100)) : 0;
        return `
        <div class="card-row ${cardClass} anim d${Math.min(i+4, 8)}" onclick="App.navigate('cantiere', {id: ${c.id}})">
          <div class="cr-info">
            <div class="cr-name">${esc(c.nome)}</div>
            ${progressPct > 0 ? `<div class="cr-progress"><div class="cr-progress-fill" style="width:${progressPct}%"></div></div>` : ''}
            <div class="cr-stats"><span>${c.totale_saldature || 0}</span> sald. &middot; <span>${c.notti_completate || 0}</span> notti</div>
          </div>
          <div class="cr-right">
            ${badge}
            ${deadlineInfo.text ? `<div class="cr-deadline ${deadlineInfo.cls}">${deadlineInfo.text}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  } else {
    listaHtml = '<div class="empty-state"><div class="icon">\uD83D\uDEA7</div><p>Nessun cantiere attivo</p></div>';
  }

  // Salva notti per il calendario (iniziale = tutteNotti)
  _dashCalNotti = tutteNotti;
  _dashCalMese = `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,'0')}`;

  return `
    <div class="dash-header anim d1">
      <div>
        <div class="dash-label">Cantieri</div>
        <div class="dash-date">${esc(utente?.nome || '')} &middot; ${dataOggi}</div>
      </div>
      <button class="btn-small" onclick="API.logout()">Esci</button>
    </div>

    ${heroHtml}

    <div class="anim d3 mb24" id="dash-calendar"></div>

    ${listaHtml}
  `;
});

Router.register('dashboard_init', async () => {
  // Render calendario iniziale
  await loadDashCalendar(_dashCalMese);
});

async function loadDashCalendar(mese) {
  const calDiv = document.getElementById('dash-calendar');
  if (!calDiv) return;

  const [anno, m] = mese.split('-').map(Number);
  const from = `${anno}-${String(m).padStart(2,'0')}-01`;
  const lastDay = new Date(anno, m, 0).getDate();
  const to = `${anno}-${String(m).padStart(2,'0')}-${lastDay}`;

  try {
    const data = await API.timeline(from, to);
    const notti = data?.notti || [];

    renderCalendar(calDiv, notti, {
      mode: 'global',
      mese: mese,
      onMonthChange: (nuovoMese) => loadDashCalendar(nuovoMese)
    });
  } catch (e) {
    calDiv.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem">Errore caricamento calendario</div>';
  }
}

function formatDashDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)}/${parseInt(m)}`;
}

function calcDeadline(dataFine) {
  if (!dataFine) return { text: '', cls: '' };
  const oggi = new Date();
  oggi.setHours(0,0,0,0);
  const deadline = new Date(dataFine + 'T00:00:00');
  const diff = Math.ceil((deadline - oggi) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: 'Scaduto', cls: 'cr-deadline-critical' };
  if (diff <= 7) return { text: diff + 'g', cls: 'cr-deadline-critical' };
  if (diff <= 14) return { text: diff + 'g', cls: 'cr-deadline-warning' };
  return { text: diff + 'g', cls: 'cr-deadline-ok' };
}

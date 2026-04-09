// Calendar Component — Riusabile per dashboard, dettaglio, panoramica
// renderCalendar(container, notti, options)
// options.mode: 'global' (num notti + barre cantiere) | 'cantiere' (num saldature)
// options.mese: 'YYYY-MM' (default mese corrente)
// options.onMonthChange(nuovoMese): callback per fetch dati nuovo mese
// options.cantieri: array cantieri per colori barre (mode global)

const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const GIORNI_NOMI_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
const CANTIERE_COLORS = ['#00D4FF','#00e676','#ff8a00','#ff3b5c','#ffd600','#a855f7','#f472b6','#38bdf8'];

function renderCalendar(container, notti, options = {}) {
  const mode = options.mode || 'global';
  const oggi = new Date();
  const oggiStr = `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,'0')}-${String(oggi.getDate()).padStart(2,'0')}`;

  // Mese corrente
  let meseCorrente = options.mese || `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,'0')}`;
  const [anno, mese] = meseCorrente.split('-').map(Number);

  // Primo giorno del mese (0=dom → converti a lun=0)
  const primoGiorno = new Date(anno, mese-1, 1);
  let startDay = primoGiorno.getDay(); // 0=dom
  startDay = startDay === 0 ? 6 : startDay - 1; // lun=0, dom=6

  const giorniMese = new Date(anno, mese, 0).getDate();

  // Mappa notti per data
  const nottiPerData = {};
  (notti || []).forEach(n => {
    const d = n.data;
    if (!d) return;
    // Verifica che la data sia nel mese corrente
    if (!d.startsWith(meseCorrente)) return;
    if (!nottiPerData[d]) nottiPerData[d] = [];
    nottiPerData[d].push(n);
  });

  // Mappa cantieri → colori (per barre mode global)
  const cantieriColorMap = {};
  let colorIdx = 0;
  if (mode === 'global') {
    (notti || []).forEach(n => {
      const key = n.cantiere_id || n.cantiere_nome || '';
      if (key && !cantieriColorMap[key]) {
        cantieriColorMap[key] = CANTIERE_COLORS[colorIdx % CANTIERE_COLORS.length];
        colorIdx++;
      }
    });
  }

  // Genera HTML
  let html = '';

  // Header mese + frecce
  html += `<div class="cal-header">
    <div class="cal-month">${MESI_NOMI[mese-1]} ${anno}</div>
    <div class="cal-nav">
      <button data-cal-dir="prev">&larr;</button>
      <button data-cal-dir="next">&rarr;</button>
    </div>
  </div>`;

  // Weekdays
  html += '<div class="cal-weekdays">';
  GIORNI_NOMI_SHORT.forEach(g => { html += `<div class="cal-weekday">${g}</div>`; });
  html += '</div>';

  // Grid
  html += '<div class="cal-grid">';

  // Celle vuote prima del primo giorno
  for (let i = 0; i < startDay; i++) {
    html += '<div class="cal-cell cal-cell-empty"></div>';
  }

  // Celle giorno
  for (let day = 1; day <= giorniMese; day++) {
    const dataStr = `${anno}-${String(mese).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayOfWeek = (startDay + day - 1) % 7; // 0=lun, 5=sab, 6=dom
    const isWeekend = dayOfWeek >= 5;
    const isToday = dataStr === oggiStr;
    const isFuture = dataStr > oggiStr;
    const notteList = nottiPerData[dataStr] || [];

    // Determina stato cella
    let cellClass = '';
    let cellContent = '';
    let tipData = null;

    if (isToday) {
      cellClass = 'cal-cell-today';
      // Se oggi ha notti completate mostrali, altrimenti "OGGI"
      const completate = notteList.filter(n => n.stato === 'completata');
      if (completate.length > 0 && mode === 'global') {
        cellContent = `<div class="cal-cell-num" style="color:var(--accent)">${completate.length}</div>`;
        tipData = buildTipData(completate, mode);
      } else if (completate.length > 0 && mode === 'cantiere') {
        const sald = completate.reduce((s,n) => s + (n.num_saldature || 0), 0);
        cellContent = sald > 0 ? `<div class="cal-cell-num" style="color:var(--accent)">${sald}</div>` : `<div style="font-size:0.55rem;font-weight:700;color:var(--accent)">OGGI</div>`;
        tipData = buildTipData(completate, mode);
      } else {
        cellContent = `<div style="font-size:0.55rem;font-weight:700;color:var(--accent)">OGGI</div>`;
      }
    } else if (notteList.length > 0) {
      const completate = notteList.filter(n => n.stato === 'completata');
      const saltate = notteList.filter(n => n.stato === 'saltata');
      const assenti = notteList.filter(n => n.stato === 'assente');

      if (completate.length > 0) {
        if (mode === 'global') {
          cellClass = completate.length > 1 ? 'cal-cell-done-multi' : 'cal-cell-done';
          cellContent = `<div class="cal-cell-num">${completate.length}</div>`;
          // Barre colorate per cantiere
          const bars = completate.map(n => {
            const key = n.cantiere_id || n.cantiere_nome || '';
            const color = cantieriColorMap[key] || 'var(--accent)';
            return `<div class="cal-cell-bar" style="background:${color}"></div>`;
          }).join('');
          cellContent += `</div><div class="cal-cell-bars">${bars}`;
        } else {
          // Mode cantiere: mostra saldature
          const sald = completate.reduce((s,n) => s + (n.num_saldature || 0), 0);
          cellClass = 'cal-cell-done';
          cellContent = `<div class="cal-cell-num" style="color:var(--green)">${sald}</div>`;
        }
        tipData = buildTipData(completate, mode);
      } else if (saltate.length > 0) {
        cellClass = 'cal-cell-skip';
        cellContent = `<div style="font-size:0.9rem">\u26A0\uFE0F</div>`;
        tipData = buildTipData(saltate, mode, true);
      } else if (assenti.length > 0) {
        cellClass = 'cal-cell-absent';
        cellContent = `<div style="font-size:0.6rem;opacity:0.6">\u2014</div>`;
      } else if (isFuture) {
        cellClass = 'cal-cell-future';
      } else {
        cellClass = 'cal-cell-done'; // programmata nel passato non completata
        cellContent = '';
      }
    } else if (isWeekend) {
      cellClass = 'cal-cell-nowork';
    } else if (isFuture) {
      cellClass = 'cal-cell-future';
    } else {
      // Giorno passato senza notti
      cellClass = 'cal-cell-nowork';
    }

    const tipAttr = tipData ? ` data-cal-tip='${escapeAttr(JSON.stringify(tipData))}'` : '';

    html += `<div class="cal-cell ${cellClass}"${tipAttr}>`;
    html += `<div class="cal-cell-day">${day}</div>`;
    html += `<div class="cal-cell-body">${cellContent}</div>`;
    html += `</div>`;
  }

  html += '</div>';

  // Legenda
  html += `<div class="cal-legend">
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(0,230,118,0.15)"></div>Fatto</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(255,214,0,0.15);border:1px solid rgba(255,214,0,0.2)"></div>Saltata</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(255,255,255,0.03)"></div>Assente</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="border:1px dashed rgba(255,255,255,0.1);background:none"></div>Futura</div>
    <div class="cal-legend-item"><div class="cal-legend-dot" style="background:rgba(0,212,255,0.1);border:2px solid rgba(0,212,255,0.4)"></div>Oggi</div>
  </div>`;

  container.innerHTML = html;

  // Event listeners

  // Tooltip on tap
  container.querySelectorAll('[data-cal-tip]').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      const tipData = JSON.parse(cell.dataset.calTip);
      showCalTooltip(e, tipData);
    });
  });

  // Navigazione mese
  container.querySelectorAll('[data-cal-dir]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dir = btn.dataset.calDir;
      let newMonth, newYear;
      if (dir === 'prev') {
        newMonth = mese - 1;
        newYear = anno;
        if (newMonth < 1) { newMonth = 12; newYear--; }
      } else {
        newMonth = mese + 1;
        newYear = anno;
        if (newMonth > 12) { newMonth = 1; newYear++; }
      }
      const nuovoMese = `${newYear}-${String(newMonth).padStart(2,'0')}`;
      if (options.onMonthChange) {
        options.onMonthChange(nuovoMese);
      }
    });
  });
}

function buildTipData(notteList, mode, isSaltata) {
  if (isSaltata) {
    const motivo = notteList[0]?.motivo_salto || 'Saltata';
    return { title: formatTipDate(notteList[0]?.data), rows: [`Saltata: ${motivo}`] };
  }

  const data = notteList[0]?.data;
  const title = formatTipDate(data);
  const rows = [];

  if (mode === 'global') {
    notteList.forEach(n => {
      const nome = n.cantiere_nome || n.nome || '?';
      const sald = n.num_saldature || 0;
      rows.push(`${nome}: ${sald} sald.`);
    });
  } else {
    const sald = notteList.reduce((s,n) => s + (n.num_saldature || 0), 0);
    rows.push(`${sald} saldature`);
    if (notteList[0]?.squadra) rows.push(`Squadra: ${notteList[0].squadra}`);
  }

  return { title, rows };
}

function formatTipDate(dataStr) {
  if (!dataStr) return '';
  const GIORNI_TIP = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const dt = new Date(dataStr + 'T12:00:00');
  const [y, m, d] = dataStr.split('-');
  return `${GIORNI_TIP[dt.getDay()]} ${parseInt(d)}/${parseInt(m)}`;
}

function showCalTooltip(e, tipData) {
  const tip = document.getElementById('cal-tooltip');
  if (!tip) return;

  let html = `<div class="cal-tooltip-title">${esc(tipData.title)}</div>`;
  tipData.rows.forEach(r => {
    const parts = r.split(':');
    if (parts.length === 2 && !r.startsWith('Saltata')) {
      html += `<div class="cal-tooltip-row"><span class="cal-tooltip-cant">${esc(parts[0].trim())}</span><span class="cal-tooltip-val">${esc(parts[1].trim())}</span></div>`;
    } else {
      html += `<div style="color:var(--text-secondary)">${esc(r)}</div>`;
    }
  });

  tip.innerHTML = html;
  tip.classList.add('show');

  const rect = e.currentTarget.getBoundingClientRect();
  tip.style.left = Math.min(rect.left, window.innerWidth - 270) + 'px';
  tip.style.top = (rect.bottom + 8) + 'px';
}

// Chiudi tooltip toccando altrove
document.addEventListener('click', () => {
  const tip = document.getElementById('cal-tooltip');
  if (tip) tip.classList.remove('show');
});

function escapeAttr(str) {
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

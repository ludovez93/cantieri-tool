// Panoramica View — Calendario globale + lista cantieri

let _panoCalMese = null;

Router.register('panoramica', async () => {
  const dashData = await API.dashboard();
  if (!dashData) return '';
  const cantieri = dashData.cantieri || [];

  const oggi = new Date();
  _panoCalMese = `${oggi.getFullYear()}-${String(oggi.getMonth()+1).padStart(2,'0')}`;

  // Lista cantieri con deadline + notti
  const maxNotti = Math.max(1, ...cantieri.map(c => c.notti_completate || 0));

  const listaHtml = cantieri.map(c => {
    const deadlineInfo = calcPanoDeadline(c.data_fine);
    const barWidth = maxNotti > 0 ? Math.round(((c.notti_completate || 0) / maxNotti) * 100) : 0;
    const countColor = (c.notti_completate || 0) > 0 ? '' : ' style="color:var(--text-muted)"';

    return `
      <div class="pano-cantiere-row">
        <div class="pano-cantiere-info">
          <div class="pano-cantiere-name">${esc(c.nome)}</div>
          ${deadlineInfo.text ? `<div class="pano-cantiere-deadline ${deadlineInfo.cls}">${deadlineInfo.text}</div>` : ''}
        </div>
        <div class="pano-cantiere-count"${countColor}>${c.notti_completate || 0}</div>
        <div class="pano-cantiere-bar"><div class="pano-cantiere-bar-fill" style="width:${barWidth}%"></div></div>
      </div>
    `;
  }).join('');

  return `
    <div class="page-header anim d1">
      <h1>Panoramica</h1>
    </div>

    <div class="anim d2 mb24" id="pano-calendar"></div>

    <div class="section-label anim d3">Per cantiere</div>
    <div class="anim d3" style="background:var(--bg-glass);border:1px solid var(--border-light);border-radius:var(--radius-lg);padding:16px;">
      ${listaHtml}
    </div>
  `;
});

Router.register('panoramica_init', async () => {
  await loadPanoCalendar(_panoCalMese);
});

async function loadPanoCalendar(mese) {
  const calDiv = document.getElementById('pano-calendar');
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
      onMonthChange: (nuovoMese) => loadPanoCalendar(nuovoMese)
    });
  } catch (e) {
    calDiv.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem">Errore caricamento calendario</div>';
  }
}

function calcPanoDeadline(dataFine) {
  if (!dataFine) return { text: '', cls: '' };
  const oggi = new Date();
  oggi.setHours(0,0,0,0);
  const dl = new Date(dataFine + 'T00:00:00');
  const diff = Math.ceil((dl - oggi) / (1000*60*60*24));
  const [y, m, d] = dataFine.split('-');
  const dateStr = `${parseInt(d)}/${parseInt(m)}`;
  if (diff < 0) return { text: `${dateStr} \u2014 scaduto`, cls: 'pano-dl-critical' };
  if (diff <= 7) return { text: `${dateStr} \u2014 ${diff}g`, cls: 'pano-dl-critical' };
  if (diff <= 14) return { text: `${dateStr} \u2014 ${diff}g`, cls: 'pano-dl-warning' };
  return { text: `${dateStr} \u2014 ${diff}g`, cls: 'pano-dl-ok' };
}

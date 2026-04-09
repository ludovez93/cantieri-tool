// Form Cantiere View (nuovo + modifica)
Router.register('form-cantiere', async (params) => {
  let cantiere = null;
  let binari = [];
  if (params.id) {
    cantiere = await API.getCantiere(params.id);
    binari = await API.listaBinari(params.id);
  }

  const isEdit = !!cantiere;

  return `
    <div class="page-header">
      <button class="back-btn" onclick="App.navigate(${isEdit ? "'cantiere', {id:" + cantiere.id + "}" : "'dashboard'"})">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <h1>${isEdit ? 'Modifica' : 'Nuovo'} Cantiere</h1>
    </div>

    <div class="input-group">
      <label>Nome</label>
      <input type="text" class="input" id="fc-nome" value="${esc(cantiere?.nome || '')}" placeholder="Es: La Spezia - Arcola">
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="input-group">
        <label>Tipo</label>
        <select id="fc-tipo">
          <option value="notturno" ${(!cantiere || cantiere?.tipo === 'notturno') ? 'selected' : ''}>Notturno</option>
          <option value="diurno" ${cantiere?.tipo === 'diurno' ? 'selected' : ''}>Diurno</option>
        </select>
      </div>
      <div class="input-group">
        <label>Orario interruzione</label>
        <input type="text" class="input" id="fc-orario" value="${esc(cantiere?.orario_interruzione || '')}" placeholder="22:00-05:30">
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="input-group">
        <label>Data inizio</label>
        <input type="date" class="input" id="fc-data-inizio" value="${cantiere?.data_inizio || ''}">
      </div>
      <div class="input-group">
        <label>Deadline</label>
        <input type="date" class="input" id="fc-data-fine" value="${cantiere?.data_fine || ''}">
      </div>
    </div>

    <div class="input-group">
      <label>Giorni attivi</label>
      <div id="fc-giorni" style="display:flex;gap:6px;flex-wrap:wrap">
        ${['Dom','Lun','Mar','Mer','Gio','Ven','Sab'].map((g, i) => {
          const attivi = (cantiere?.giorni || '0,1,2,3,4,5,6').split(',').map(Number);
          const on = attivi.includes(i);
          return `<button type="button" class="btn btn-small ${on ? 'btn-primary' : 'btn-secondary'}" data-giorno="${i}" style="width:auto;min-width:44px;padding:8px 10px;font-size:0.75rem">${g}</button>`;
        }).join('')}
      </div>
    </div>

    <div class="input-group">
      <label>Note</label>
      <textarea id="fc-note" style="min-height:60px;font-family:var(--font-display)">${esc(cantiere?.note || '')}</textarea>
    </div>

    <div class="switch-row">
      <span>Urgente</span>
      <div class="switch ${cantiere?.urgente ? 'on' : ''}" id="fc-urgente"></div>
    </div>

    <button class="btn btn-primary" id="fc-salva" style="margin-top:16px">${isEdit ? 'Salva modifiche' : 'Crea cantiere'}</button>

    <div class="section" style="margin-top:24px">
      <h2>Binari</h2>
      <div id="binari-list">
        ${binari.map(b => `
          <div class="card" style="margin-bottom:10px" data-binario-id="${b.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span class="badge badge-accent">${esc(b.tipo)}</span>
              <button class="btn btn-small btn-danger" onclick="eliminaBinario(${b.id})">Elimina</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
              <div>
                <label style="font-size:0.7rem;color:var(--text-muted)">Km inizio</label>
                <input type="text" class="input" value="${esc(b.km_inizio || '')}" data-field="km_inizio" style="font-family:var(--font-mono);padding:8px">
              </div>
              <div>
                <label style="font-size:0.7rem;color:var(--text-muted)">Km fine</label>
                <input type="text" class="input" value="${esc(b.km_fine || '')}" data-field="km_fine" style="font-family:var(--font-mono);padding:8px">
              </div>
            </div>
            <div>
              <label style="font-size:0.7rem;color:var(--text-muted)">Ultimo km controllato</label>
              <input type="text" class="input" value="${esc(b.ultimo_km || '')}" data-field="ultimo_km" style="font-family:var(--font-mono);padding:8px">
            </div>
          </div>
        `).join('')}
      </div>

      ${isEdit ? `
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-small btn-secondary" onclick="aggiungiBinario(${cantiere.id}, 'pari')">+ Pari</button>
          <button class="btn btn-small btn-secondary" onclick="aggiungiBinario(${cantiere.id}, 'dispari')">+ Dispari</button>
          <button class="btn btn-small btn-secondary" onclick="aggiungiBinario(${cantiere.id}, 'unico')">+ Unico</button>
        </div>
      ` : '<p style="color:var(--text-muted);font-size:0.8rem">Salva il cantiere prima di aggiungere binari</p>'}
    </div>

    ${isEdit ? `
      <button class="btn btn-danger" id="fc-elimina" style="margin-top:12px">Elimina cantiere</button>
    ` : ''}
  `;
});

Router.register('form-cantiere_init', (params) => {
  // Switch toggle
  const sw = document.getElementById('fc-urgente');
  sw.addEventListener('click', () => sw.classList.toggle('on'));

  // Giorni toggle
  document.querySelectorAll('#fc-giorni button').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('btn-primary');
      btn.classList.toggle('btn-secondary');
    });
  });

  function getGiorni() {
    const attivi = [];
    document.querySelectorAll('#fc-giorni button.btn-primary').forEach(btn => {
      attivi.push(btn.dataset.giorno);
    });
    return attivi.join(',');
  }

  // Save cantiere
  document.getElementById('fc-salva').addEventListener('click', async () => {
    const data = {
      nome: document.getElementById('fc-nome').value.trim(),
      tipo: document.getElementById('fc-tipo').value,
      orario_interruzione: document.getElementById('fc-orario').value.trim(),
      data_inizio: document.getElementById('fc-data-inizio').value || null,
      data_fine: document.getElementById('fc-data-fine').value || null,
      giorni: getGiorni(),
      note: document.getElementById('fc-note').value.trim(),
      urgente: sw.classList.contains('on'),
    };

    if (!data.nome) { App.toast('Nome obbligatorio', 'error'); return; }

    try {
      if (params.id) {
        await API.aggiornaCantiere(params.id, data);
        // Salva anche i binari modificati
        const binariCards = document.querySelectorAll('[data-binario-id]');
        for (const card of binariCards) {
          const bId = card.dataset.binarioId;
          const updates = {};
          card.querySelectorAll('[data-field]').forEach(input => {
            updates[input.dataset.field] = input.value.trim();
          });
          await API.aggiornaBinario(bId, updates);
        }
        App.toast('Cantiere aggiornato', 'success');
        App.navigate('cantiere', { id: params.id });
      } else {
        const c = await API.creaCantiere(data);
        App.toast('Cantiere creato — aggiungi i binari', 'success');
        App.navigate('form-cantiere', { id: c.id });
      }
    } catch (e) {
      App.toast('Errore: ' + e.message, 'error');
    }
  });

  // Aggiungi binario
  window.aggiungiBinario = async function(cantiereId, tipo) {
    try {
      await API.creaBinario(cantiereId, { tipo });
      App.toast('Binario aggiunto', 'success');
      App.navigate('form-cantiere', { id: cantiereId });
    } catch (e) {
      App.toast('Errore: ' + e.message, 'error');
    }
  };

  // Elimina binario
  window.eliminaBinario = async function(id) {
    try {
      await API.eliminaBinario(id);
      App.toast('Binario eliminato', 'success');
      App.navigate('form-cantiere', { id: params.id });
    } catch (e) {
      App.toast('Errore: ' + e.message, 'error');
    }
  };

  // Delete cantiere
  const btnElimina = document.getElementById('fc-elimina');
  if (btnElimina) {
    btnElimina.addEventListener('click', async () => {
      if (!confirm('Eliminare questo cantiere e tutti i dati associati?')) return;
      try {
        await API.eliminaCantiere(params.id);
        App.toast('Cantiere eliminato', 'success');
        App.navigate('dashboard');
      } catch (e) {
        App.toast('Errore: ' + e.message, 'error');
      }
    });
  }
});

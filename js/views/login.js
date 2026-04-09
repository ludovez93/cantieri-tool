// Login View
Router.register('login', async () => {
  const utenti = await API.listaUtenti();
  if (!utenti) return '';

  return `
    <div class="login-container">
      <div class="login-title">
        <h1>Cantieri Tool</h1>
        <p>Gestione operativa cantieri</p>
      </div>
      <div class="login-box" id="login-box">
        <div id="user-select">
          ${utenti.map(u => `
            <button class="user-btn" data-nome="${esc(u.nome)}">
              <div class="avatar">${esc(u.nome[0])}</div>
              ${esc(u.nome)}
            </button>
          `).join('')}
        </div>
        <div id="pin-section" class="hidden">
          <p style="text-align:center;color:var(--text-secondary);margin-bottom:12px;font-size:0.9rem">
            PIN per <strong id="pin-user-name"></strong>
          </p>
          <div class="pin-input">
            <input class="pin-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="0">
            <input class="pin-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="1">
            <input class="pin-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="2">
            <input class="pin-digit" type="tel" maxlength="1" inputmode="numeric" data-idx="3">
          </div>
          <p class="login-error" id="login-error"></p>
          <button class="btn btn-secondary" id="back-to-users" style="margin-top:8px">Indietro</button>
        </div>
      </div>
    </div>
  `;
});

Router.register('login_init', () => {
  let selectedUser = null;

  document.querySelectorAll('.user-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedUser = btn.dataset.nome;
      document.getElementById('user-select').classList.add('hidden');
      document.getElementById('pin-section').classList.remove('hidden');
      document.getElementById('pin-user-name').textContent = selectedUser;
      document.querySelector('.pin-digit[data-idx="0"]').focus();
    });
  });

  document.getElementById('back-to-users').addEventListener('click', () => {
    document.getElementById('user-select').classList.remove('hidden');
    document.getElementById('pin-section').classList.add('hidden');
    document.querySelectorAll('.pin-digit').forEach(d => d.value = '');
    document.getElementById('login-error').textContent = '';
  });

  // PIN input handling
  const digits = document.querySelectorAll('.pin-digit');
  digits.forEach(d => {
    d.addEventListener('input', async (e) => {
      const idx = parseInt(d.dataset.idx);
      if (d.value && idx < 3) {
        digits[idx + 1].focus();
      }
      // Check if all 4 digits entered
      const pin = Array.from(digits).map(x => x.value).join('');
      if (pin.length === 4) {
        try {
          const result = await API.login(selectedUser, pin);
          if (result) {
            API.setToken(result.token);
            API.setUtente(result.utente);
            App.navigate('dashboard');
          }
        } catch (err) {
          document.getElementById('login-error').textContent = 'PIN errato';
          digits.forEach(x => x.value = '');
          digits[0].focus();
        }
      }
    });

    d.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !d.value) {
        const idx = parseInt(d.dataset.idx);
        if (idx > 0) digits[idx - 1].focus();
      }
    });
  });
});

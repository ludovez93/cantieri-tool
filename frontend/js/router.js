// Simple router
const Router = {
  views: {},

  register(name, renderFn) {
    this.views[name] = renderFn;
  },

  async navigate(view, params = {}) {
    const app = document.getElementById('app');
    const navbar = document.getElementById('navbar');

    if (!this.views[view]) {
      console.error('View non trovata:', view);
      return;
    }

    // Navbar visibility: mostra su dashboard, panoramica, log-notte. Nascondi su login, cantiere, form-cantiere
    const navViews = ['dashboard', 'panoramica', 'log-notte'];
    if (navViews.includes(view)) {
      navbar.classList.remove('hidden');
    } else {
      navbar.classList.add('hidden');
    }

    // Update active nav button (solo se navbar visibile)
    if (navViews.includes(view)) {
      navbar.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
      });
    }

    // Render
    app.innerHTML = '<div class="spinner"></div>';
    try {
      const html = await this.views[view](params);
      app.innerHTML = html;
      // Call post-render hook if exists
      if (this.views[view + '_init']) {
        this.views[view + '_init'](params);
      }
    } catch (err) {
      app.innerHTML = `<div class="empty-state"><p>Errore: ${err.message}</p></div>`;
      console.error(err);
    }
  }
};

// App — Main controller
const App = {
  navigate(view, params = {}) {
    Router.navigate(view, params);
  },

  toast(message, type = '') {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = 'toast ' + type;

    // Force reflow
    el.offsetHeight;
    el.classList.add('show');

    setTimeout(() => el.classList.remove('show'), 2500);
  },

  init() {
    // Navbar clicks
    document.querySelectorAll('#navbar button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigate(btn.dataset.view);
      });
    });

    // Check if logged in
    if (API.token) {
      this.navigate('dashboard');
    } else {
      this.navigate('login');
    }
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

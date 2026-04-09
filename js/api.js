// API Client — Cantieri Tool
const API = {
  // Detect base path: GitHub Pages → server, otherwise local/proxy
  base: (function() {
    if (window.location.hostname.includes('github.io')) {
      return 'https://f850d6fc571398.lhr.life/api';
    }
    let path = window.location.pathname;
    if (path.includes('.')) path = path.substring(0, path.lastIndexOf('/'));
    path = path.replace(/\/+$/, '');
    return (path || '') + '/api';
  })(),
  token: localStorage.getItem('ct_token'),

  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.token) opts.headers['Authorization'] = `Bearer ${this.token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(this.base + path, opts);
    const data = await res.json();

    if (res.status === 401) {
      this.logout();
      return null;
    }
    if (!res.ok) throw new Error(data.error || 'Errore server');
    return data;
  },

  setToken(token) {
    this.token = token;
    localStorage.setItem('ct_token', token);
  },

  logout() {
    this.token = null;
    localStorage.removeItem('ct_token');
    localStorage.removeItem('ct_utente');
    App.navigate('login');
  },

  getUtente() {
    const s = localStorage.getItem('ct_utente');
    return s ? JSON.parse(s) : null;
  },

  setUtente(u) {
    localStorage.setItem('ct_utente', JSON.stringify(u));
  },

  // Auth
  listaUtenti() { return this.request('GET', '/auth/utenti'); },
  login(nome, pin) { return this.request('POST', '/auth/login', { nome, pin }); },

  // Cantieri
  listaCantieri() { return this.request('GET', '/cantieri'); },
  getCantiere(id) { return this.request('GET', `/cantieri/${id}`); },
  creaCantiere(data) { return this.request('POST', '/cantieri', data); },
  aggiornaCantiere(id, data) { return this.request('PUT', `/cantieri/${id}`, data); },
  eliminaCantiere(id) { return this.request('DELETE', `/cantieri/${id}`); },

  // Notti
  listaNotti(cantiereId) { return this.request('GET', `/cantieri/${cantiereId}/notti`); },
  creaNotte(cantiereId, data) { return this.request('POST', `/cantieri/${cantiereId}/notti`, data); },
  aggiornaNotte(id, data) { return this.request('PUT', `/notti/${id}`, data); },
  scalaNotti(id) { return this.request('POST', `/notti/${id}/scala`); },

  // Binari
  listaBinari(cantiereId) { return this.request('GET', `/cantieri/${cantiereId}/binari`); },
  creaBinario(cantiereId, data) { return this.request('POST', `/cantieri/${cantiereId}/binari`, data); },
  aggiornaBinario(id, data) { return this.request('PUT', `/binari/${id}`, data); },
  eliminaBinario(id) { return this.request('DELETE', `/binari/${id}`); },

  // Saldature & Difetti
  listaSaldature(cantiereId) { return this.request('GET', `/cantieri/${cantiereId}/saldature`); },
  listaDifetti(cantiereId) { return this.request('GET', `/cantieri/${cantiereId}/difetti`); },
  aggiornaDifetto(id, data) { return this.request('PUT', `/difetti/${id}`, data); },

  // Parse
  parseSaldature(testo) { return this.request('POST', '/parse', { testo }); },
  logNotte(cantiereId, data) { return this.request('POST', `/cantieri/${cantiereId}/log-notte`, data); },

  // Parse riepilogo
  parseRiepilogo(testo) { return this.request('POST', '/parse-riepilogo', { testo }); },
  logRiepilogo(cantiereId, data) { return this.request('POST', `/cantieri/${cantiereId}/log-riepilogo`, data); },

  // Dashboard
  dashboard() { return this.request('GET', '/dashboard'); },
  timeline(from, to) { return this.request('GET', `/timeline?from=${from}&to=${to}`); },

  // Meteo
  meteo(lat, lon) { return this.request('GET', `/meteo/${lat}/${lon}`); },
};

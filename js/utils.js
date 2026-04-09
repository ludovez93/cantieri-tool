// HTML escaping — previene XSS
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Disable button after click (anti doppio-click)
function disableBtn(id) {
  const btn = document.getElementById(id);
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  return btn;
}

function enableBtn(id) {
  const btn = document.getElementById(id);
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
}

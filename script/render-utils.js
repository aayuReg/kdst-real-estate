// Shared rendering helpers used by script/properties-render.js and
// script/plots-render.js. Kept in one place because both files inject
// CMS-controlled strings (property titles, plot labels, etc.) into
// innerHTML and need identical XSS protection — duplicating this logic
// per-file would risk one copy drifting out of sync with a fix applied
// to the other.

window.KDST = window.KDST || {};

window.KDST.escapeHTML = function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
};

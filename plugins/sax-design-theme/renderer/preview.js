'use strict';
const theme = document.getElementById('theme');
const toggle = document.getElementById('toggle');
const palette = document.getElementById('palette');
function renderPalette() {
  const styles = getComputedStyle(document.documentElement);
  palette.replaceChildren();
  for (const name of ['primary', 'success', 'warning', 'error', 'info', 'purple']) {
    const row = document.createElement('div'); row.className = 'palette-row'; row.setAttribute('role','row');
    const label = document.createElement('span'); label.className = 'palette-label'; label.setAttribute('role','rowheader'); label.textContent = name; row.append(label);
    for (const state of ['base','hover','active','soft','subtle']) {
      const cell = document.createElement('div'); cell.className = 'swatch'; cell.setAttribute('role','cell');
      cell.style.background = `var(--sax-${name}${state === 'base' ? '' : '-'+state})`;
      cell.style.color = state === 'soft' || state === 'subtle' ? `var(--sax-${name})` : 'var(--sax-surface)';
      const value = `${styles.getPropertyValue('--sax-'+name+'-h').trim()} / ${styles.getPropertyValue('--sax-'+state+'-s').trim()} / ${styles.getPropertyValue('--sax-'+state+'-l').trim()}`;
      cell.textContent = state; cell.title = `HSL ${value}`; cell.setAttribute('aria-label',`${name} ${state}, HSL ${value}`); row.append(cell);
    }
    palette.append(row);
  }
}
theme.addEventListener('load', renderPalette);
toggle.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  theme.href = `../themes/sax-${dark ? 'dark' : 'light'}.css`;
  toggle.textContent = dark ? '切换浅色' : '切换深色'; toggle.setAttribute('aria-pressed', String(dark));
});
let clicks = 0;
document.getElementById('demo').addEventListener('click', () => { document.getElementById('feedback').textContent = `交互正常 · ${String(++clicks).padStart(2,'0')} 次`; });
renderPalette();

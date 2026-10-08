const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const hues = { primary: 252, success: 150, warning: 38, error: 4, info: 195, purple: 285 };
const palettes = {
  light: { canvas: 95, surface: 100, raised: 99, inset: 92, text: 16, secondary: 31, muted: 39, shadow: .09, states: { base: [88, 25], hover: [92, 22], active: [96, 18], soft: [85, 94], subtle: [75, 97] } },
  dark: { canvas: 10, surface: 13, raised: 18, inset: 8, text: 96, secondary: 82, muted: 70, shadow: .24, states: { base: [88, 76], hover: [92, 81], active: [96, 86], soft: [65, 20], subtle: [55, 15] } }
};
function build(mode) {
  const p = palettes[mode];
  const states = { ...p.states, fill: [92, mode === 'light' ? 54 : 74], 'fill-hover': [94, mode === 'light' ? 48 : 80], 'fill-active': [96, mode === 'light' ? 42 : 85] };
  const vars = {
    '--sax-radius-small': '4px', '--sax-radius-large': '8px', '--sax-gap': '12px',
    '--sax-canvas': `hsl(245 48% ${p.canvas}%)`, '--sax-surface': `hsl(245 32% ${p.surface}%)`,
    '--sax-raised': `hsl(245 38% ${p.raised}%)`, '--sax-inset': `hsl(245 38% ${p.inset}%)`,
    '--sax-ink': `hsl(245 32% ${p.text}%)`, '--sax-secondary': `hsl(245 24% ${p.secondary}%)`, '--sax-muted': `hsl(245 18% ${p.muted}%)`,
    // Light travels from upper-left to lower-right: every cast shadow has +x/+y.
    '--sax-shadow-small': `2px 3px 7px -3px hsl(250 55% 18% / ${p.shadow})`,
    '--sax-shadow-large': `4px 6px 12px -7px hsl(250 55% 16% / ${p.shadow}), 10px 16px 30px -16px hsl(250 55% 16% / ${p.shadow + .04})`,
    '--sax-shadow-floating': `6px 9px 18px -9px hsl(250 55% 12% / ${p.shadow + .03}), 16px 24px 48px -20px hsl(250 55% 12% / ${p.shadow + .08})`,
    '--sax-glass': `hsl(245 ${mode === 'light' ? 65 : 42}% ${mode === 'light' ? 99 : 16}% / ${mode === 'light' ? .64 : .70})`,
    '--sax-glass-focus': `hsl(252 ${mode === 'light' ? 92 : 60}% ${mode === 'light' ? 96 : 23}% / .86)`,
    '--sax-sheen': `linear-gradient(135deg, hsl(200 100% ${mode === 'light' ? 100 : 82}% / ${mode === 'light' ? .58 : .08}) 0%, hsl(252 100% 80% / 0) 65%)`,
    '--sax-backdrop': 'blur(22px) saturate(155%)',
    '--sax-ambient': `radial-gradient(ellipse at 0% 0%, hsl(190 95% 62% / ${mode === 'light' ? .23 : .12}), hsl(190 95% 62% / 0) 55%), radial-gradient(ellipse at 85% 85%, hsl(265 100% 68% / ${mode === 'light' ? .19 : .15}), hsl(265 100% 68% / 0) 65%), linear-gradient(135deg, var(--sax-canvas), var(--sax-substrate))`,
    '--sax-substrate': `hsl(258 ${mode === 'light' ? 65 : 48}% ${mode === 'light' ? 96 : 9}%)`,
    '--sax-action': 'var(--sax-primary-fill)',
    '--sax-action-hover': 'var(--sax-primary-fill-hover)',
    '--sax-action-active': 'var(--sax-primary-fill-active)',
    '--font-mono': '"Maple Mono", "Maple Mono NF CN", "Maple Mono NF", Consolas, "Liberation Mono", monospace',
    '--font-sans': '"Sax Digits", "Segoe UI", "Microsoft YaHei UI", system-ui, sans-serif'
  };
  for (const [state, [s,l]] of Object.entries(states)) { vars[`--sax-${state}-s`] = `${s}%`; vars[`--sax-${state}-l`] = `${l}%`; }
  for (const [name,h] of Object.entries(hues)) {
    vars[`--sax-${name}-h`] = h;
    for (const state of Object.keys(states)) vars[`--sax-${name}${state === 'base' ? '' : '-'+state}`] = `hsl(var(--sax-${name}-h) var(--sax-${state}-s) var(--sax-${state}-l))`;
  }
  const aliases = {
    'bg-primary':'surface', 'bg-secondary':'canvas', 'bg-tertiary':'inset', 'bg-inset':'inset', 'bg-under':'canvas', 'bg-sidebar':'glass', 'settings-rail-bg':'glass',
    'bg-dock':'glass', 'bg-dock-raised':'glass', 'bg-elevated':'glass', 'bg-elevated-opaque':'raised', 'bg-elevated-primary':'glass', 'bg-composer':'glass',
    'text-primary':'ink', 'text-secondary':'secondary', 'text-muted':'muted', 'text-faint':'muted', 'placeholder-ink':'muted',
    'accent':'action', 'accent-hover':'action-hover', 'accent-active':'action-active', 'accent-soft':'primary-soft', 'focus':'action',
    'success':'success', 'warning':'warning', 'error':'error', 'info':'info', 'purple':'purple',
    'settings-field-bg':'raised', 'settings-nav-active':'primary-soft', 'field-inset-bg':'inset', 'field-inset-focus-bg':'surface',
    'tile':'canvas', 'tile-hover':'inset', 'tile-deep':'inset', 'raised':'raised', 'tool-row-bg':'canvas', 'bg-chip':'inset',
    'thinking-code-bg':'inset', 'code-head-bg':'canvas', 'code-hover-bg':'inset', 'mermaid-canvas':'surface',
    'shadow-composer':'shadow-large', 'shadow-dialog':'shadow-floating', 'shadow-model-menu':'shadow-floating', 'raised-shadow':'shadow-small'
  };
  for (const [key,value] of Object.entries(aliases)) vars[`--ds-${key}`] = `var(--sax-${value})`;
  for (const name of ['success','warning','error','info']) for (const state of ['hover','active','soft','subtle']) vars[`--ds-${name}-${state}`] = `var(--sax-${name}-${state})`;
  for (const name of ['border-default','border-subtle','border-strong','switch-ring-off']) vars[`--ds-${name}`] = 'hsl(220 0% 0% / 0)';
  vars['--ds-elevation-stroke'] = '0 0 0 hsl(220 0% 0% / 0)';
  vars['--ds-bg-hover'] = 'hsl(var(--sax-primary-h) 90% 60% / .09)';
  vars['--ds-bg-active'] = 'hsl(var(--sax-primary-h) 90% 60% / .16)';
  vars['--ds-scrim'] = 'hsl(220 30% 3% / .40)';
  vars['--ds-modal-veil'] = 'hsl(220 30% 3% / .32)';
  for (const size of ['3xs','2xs','xs','sm']) vars[`--radius-${size}`] = '4px';
  for (const size of ['md','md-plus','lg','lg-plus','xl','2xl','full']) vars[`--radius-${size}`] = '8px';
  vars['--ds-composer-radius'] = vars['--ds-composer-radius-lg'] = '8px';
  return `/* Generated by scripts/build.cjs. Edit the source, not this file. */\n@font-face {\n  font-family: "Sax Digits";\n  src: local("Maple Mono"), local("Consolas"), local("Liberation Mono"), local("Menlo");\n  unicode-range: U+0030-0039;\n  font-display: swap;\n}\n:root, :root[data-theme="${mode}"] {\n  color-scheme: ${mode};\n${Object.entries(vars).map(([k,v])=>`  ${k}: ${v};`).join('\n')}\n}\n` + ['structure.css', 'window-frame.css', 'motion.css', 'search.css'].map(file => fs.readFileSync(path.join(root, 'styles', file), 'utf8')).join('\n');
}
function buildDissolvePreview(libraryOnly = false) {
  const core = fs.readFileSync(path.join(root, 'renderer/dissolve.mjs'), 'utf8').replace(/^export /gm, '');
  const adapter = fs.readFileSync(path.join(root, 'renderer/host-dissolve.mjs'), 'utf8').replace(/^import .*\n/gm, '').replace(/^export /gm, '');
  const demo = libraryOnly ? 'window.SaxDissolve = { attachHostDissolve, captureSurface, createDissolveEngine };' : fs.readFileSync(path.join(root, 'renderer/dissolve-demo.js'), 'utf8');
  return `/* Generated shared-engine file:// preview. Do not edit. */\n(() => {\n${core}\n${adapter}\n${demo}\n})();\n`;
}
if (require.main === module) {
  fs.mkdirSync(path.join(root,'themes'),{recursive:true});
  for (const mode of Object.keys(palettes)) fs.writeFileSync(path.join(root,`themes/sax-${mode}.css`),build(mode));
  fs.writeFileSync(path.join(root,'renderer/dissolve-preview.js'),buildDissolvePreview());
  fs.writeFileSync(path.join(root,'renderer/dissolve-runtime-preview.js'),buildDissolvePreview(true));
  console.log('Built Sax Light / Dark and shared dissolve preview');
}
module.exports = { build, hues, palettes, buildDissolvePreview };

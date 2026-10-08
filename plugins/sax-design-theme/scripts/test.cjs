const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build, hues, palettes, buildDissolvePreview } = require('./build.cjs');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json'), 'utf8'));
assert.ok(manifest.permissions.includes('ui.window.appearance'), 'native appearance permission required');
assert.deepEqual(manifest.contributes.windowAppearance, {
  backgroundColor: { light: '#00000000', dark: '#00000000' }, cornerRadius: 8
}, 'CSS transparency must be paired with native transparency in both modes');
assert.equal(manifest.engines.piDesktop, '>=0.17.0');
assert.ok(manifest.permissions.includes('renderer.extension'));
assert.equal(manifest.renderer, 'renderer/extension.mjs');
assert.equal(fs.readFileSync(path.join(__dirname, '../renderer/dissolve-preview.js'), 'utf8'), buildDissolvePreview());
assert.equal(fs.readFileSync(path.join(__dirname, '../renderer/dissolve-runtime-preview.js'), 'utf8'), buildDissolvePreview(true));
const motion = fs.readFileSync(path.join(__dirname, '../styles/motion.css'), 'utf8');
assert.ok(motion.includes('@media (prefers-reduced-motion: reduce)'));
assert.ok(motion.includes('@starting-style'));
assert.ok(motion.includes('--sax-motion-menu: 0s;'));
assert.ok(motion.includes('--sax-motion-offset: 0px;'));
assert.ok(!/\btransform\s*:|transition\s*:\s*all|will-change\s*:/.test(motion), 'motion must preserve host positioning and avoid permanent layer promotion');
for (const name of ['sax-dialog-enter', 'sax-surface-enter', 'sax-fade-exit']) assert.ok(motion.includes('@keyframes ' + name));
assert.ok(!/\.toast\.closing\s*\{/.test(motion), 'host toast-out lifecycle must remain intact');
function luminance(h,s,l) {
  s/=100; l/=100;
  const a=s*Math.min(l,1-l);
  const rgb=[0,8,4].map(n=> { const k=(n+h/30)%12; const c=l-a*Math.max(-1,Math.min(k-3,9-k,1)); return c<=.04045?c/12.92:((c+.055)/1.055)**2.4; });
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
const contrast=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
let min=Infinity;
for(const [mode,p] of Object.entries(palettes)) {
  const css=fs.readFileSync(path.join(__dirname,`../themes/sax-${mode}.css`),'utf8');
  assert.equal(css,build(mode),'stale generated CSS');
  const defined=new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
  for(const m of css.matchAll(/var\((--sax-[\w-]+)\)/g)) assert.ok(defined.has(m[1]),`undefined ${m[1]}`);
  assert.ok(!/@import|url\(/i.test(css));
  assert.ok(css.includes('--sax-radius-small: 4px;')&&css.includes('--sax-radius-large: 8px;'));
  assert.ok(!css.includes('--sax-window-inset-'), 'no artificial window padding');
  assert.ok(!css.includes('--sax-window-shadow'), 'no synthetic outer shadow');
  const frame = fs.readFileSync(path.join(__dirname, '../styles/window-frame.css'), 'utf8');
  assert.ok(frame.includes('padding: 0 !important;'));
  assert.ok(frame.includes('transform: none;'));
  assert.ok(!/clip-path:|overflow:|translateZ\(/.test(frame), 'native host owns clipping');
  assert.ok(css.includes('backdrop-filter: var(--sax-backdrop)'));
  for (const shadow of css.matchAll(/--sax-shadow-[a-z]+:\s*([^;]+);/g)) {
    for (const layer of shadow[1].split(',')) {
      const xy = layer.trim().match(/^([\d.]+)px ([\d.]+)px/);
      assert.ok(xy && Number(xy[1]) > 0 && Number(xy[2]) > 0, 'shadow must fall down-right');
    }
  }
  for (const state of ['fill','fill-hover','fill-active']) {
    for (const name of Object.keys(hues)) assert.ok(css.includes(`hsl(var(--sax-${name}-h) var(--sax-${state}-s) var(--sax-${state}-l))`));
    const s = Number(css.match(new RegExp(`--sax-${state}-s: ([0-9]+)%`))[1]);
    const l = Number(css.match(new RegExp(`--sax-${state}-l: ([0-9]+)%`))[1]);
    assert.ok(contrast(luminance(hues.primary,s,l),luminance(245,32,p.surface)) >= 4.5, `${mode} primary ${state}`);
  }
  for(const [name,h] of Object.entries(hues)) {
    for(const [state,[s,l]] of Object.entries(p.states)) {
      assert.ok(css.includes(`hsl(var(--sax-${name}-h) var(--sax-${state}-s) var(--sax-${state}-l))`));
      const foreground = ['soft','subtle'].includes(state) ? luminance(h,...p.states.base) : luminance(245,32,p.surface);
      const ratio=contrast(foreground,luminance(h,s,l)); min=Math.min(min,ratio);
      assert.ok(ratio>=4.5,`${mode} ${name} ${state}: contrast ${ratio.toFixed(2)}`);
    }
  }
}
(async()=>{
  const commands=[]; let opened=false;
  global.pi={commands:{register:async c=>commands.push(c),unregister:async id=>assert.equal(id,commands[0].id)},ui:{openPanel:async()=>{opened=true;}}};
  const plugin=require('../main.js'); await plugin.onLoad(); assert.equal(commands.length,1); await commands[0].run(); assert.ok(opened); await plugin.onUnload();
  console.log(`PASS: native transparent background + radius declaration, permission, generated CSS, shared HSL, directional shadows, glass, 60 semantic pairs (min ${min.toFixed(2)}:1), 6 action pairs, lifecycle mock.`);
})().catch(e=>{console.error(e);process.exitCode=1;});

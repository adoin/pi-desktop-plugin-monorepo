// Optional browser regression. Set SAX_TEST_DEPENDENCIES to a directory with puppeteer installed.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const modulePath = require.resolve('puppeteer', { paths: [process.env.SAX_TEST_DEPENDENCIES || process.cwd()] });
  const { default: puppeteer } = await import(pathToFileURL(modulePath));
  const browser = await puppeteer.launch({ headless: true, ...(process.env.SAX_TEST_BROWSER ? { executablePath: process.env.SAX_TEST_BROWSER } : {}) });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1100, height: 850 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../renderer/motion.html')).href);
    await page.click('#dialog-open'); await sleep(450); await page.click('#dialog-close');
    await page.waitForSelector('[data-sax-dissolve-ghost]');
    assert.equal(await page.$eval('#demo-dialog', d => d.open), false, 'native dialog is closed while ghost exits');
    await page.waitForFunction(() => !document.querySelector('[data-sax-dissolve-ghost]'));
    await page.click('#particles-toggle'); // Remaining checks exercise the CSS fallback.
    await sleep(300);
    const results = [];
    for (const mode of ['light', 'dark']) {
      if (mode === 'dark') {
        await page.click('#mode');
        await page.waitForFunction(() => getComputedStyle(document.documentElement).colorScheme === 'dark');
      }
      // Capture natural frames, never pause/finish animations or assign currentTime.
      await page.evaluate(() => {
        window.samples = [];
        const d = document.getElementById('demo-dialog');
        const record = () => { const s = getComputedStyle(d); window.samples.push({ opacity: Number(s.opacity), scale: Number(s.scale), time: performance.now() }); if (window.samples.length < 30) requestAnimationFrame(record); };
        document.getElementById('dialog-open').click(); requestAnimationFrame(record);
      });
      await sleep(550);
      const frames = await page.evaluate(() => window.samples);
      assert.ok(frames.some(x => x.opacity > 0 && x.opacity < 1 && x.scale > .96 && x.scale < 1), mode + ' natural intermediate frames');
      assert.ok(await page.$eval('#event-log', e => e.textContent.includes('end：sax-dialog-enter · 250ms')), 'real animationend');
      await page.click('#dialog-close');
      assert.equal(await page.$eval('#demo-dialog', d => d.open), true, 'retain during exit');
      await page.waitForFunction(() => !document.getElementById('demo-dialog').open);
      assert.ok(await page.$eval('#event-log', e => e.textContent.includes('end：sax-dialog-exit · 150ms')), 'exit event before removal');
      await page.waitForFunction(() => document.activeElement.id === 'dialog-open');
      await page.click('#dialog-open'); await sleep(300);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.getElementById('demo-dialog').open);
      await page.click('#menu-toggle'); await sleep(300);
      assert.equal(await page.$eval('#demo-menu', e => getComputedStyle(e).opacity), '1');
      await page.keyboard.press('Escape'); await sleep(300);
      assert.equal(await page.$eval('#demo-menu', e => getComputedStyle(e).pointerEvents), 'none');
      results.push({ mode, naturalFrames: frames.filter(x => x.opacity > 0 && x.opacity < 1).length });
    }
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.click('#dialog-open');
    assert.equal(await page.$eval('#demo-dialog', d => getComputedStyle(d).animationDuration), '0s');
    await page.click('#dialog-close');
    assert.equal(await page.$eval('#demo-dialog', d => d.open), false);
    await page.click('#force'); await page.click('#dialog-open');
    assert.equal(await page.$eval('#demo-dialog', d => getComputedStyle(d).animationDuration), '0.25s');
    await page.click('#dialog-close'); await page.waitForFunction(() => !document.getElementById('demo-dialog').open);
    await page.setViewport({ width: 480, height: 800 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'narrow layout');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: results, reducedMotion: true, previewOverride: true, narrowLayout: true, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

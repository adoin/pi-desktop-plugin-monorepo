import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

export function findBrowser(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.PI_TEST_BROWSER || env.SAX_TEST_BROWSER;
  if (explicit) {
    if (!fs.existsSync(explicit)) throw new Error(`Browser does not exist: ${explicit}`);
    return explicit;
  }
  const candidates = process.platform === 'win32' ? [
    path.join(env.PROGRAMFILES || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
    path.join(env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
    ...(env.LOCALAPPDATA ? [path.join(env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe')] : [])
  ] : process.platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ] : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  const found = candidates.find(file => fs.existsSync(file));
  if (!found) throw new Error('No Chromium browser found. Set PI_TEST_BROWSER to your Chrome/Edge executable.');
  return found;
}
export async function launchBrowser() {
  return puppeteer.launch({ headless: true, executablePath: findBrowser() });
}

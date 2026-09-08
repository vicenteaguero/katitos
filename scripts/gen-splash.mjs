/**
 * Render the iOS launch images from the app's own boot screen.
 *
 *   node scripts/gen-splash.mjs
 *
 * iOS paints `apple-touch-startup-image` before the web view exists, and then
 * the web view paints `#boot`. If those two differ by so much as a font or a
 * few pixels, the app looks like it starts twice - so this generates the first
 * one FROM the second rather than trusting two hands to draw the same picture.
 *
 * The one thing the web view cannot do is paint behind the status bar: with
 * `apple-mobile-web-app-status-bar-style: black` it starts underneath it. So
 * the launch image is composed the same way - a black band of exactly that
 * height, and the boot screen below it - and the hand-off moves nothing.
 *
 * Needs a Chrome on the machine. Set CHROME to point at one if it is not at
 * /usr/bin/google-chrome.
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const CHROME = process.env.CHROME ?? '/usr/bin/google-chrome';

/** width/height in CSS px, `inset` = the status bar, in CSS px. */
const DEVICES = [
  { name: 'iphone13', width: 390, height: 844, inset: 47 },
  { name: 'iphone17promax', width: 440, height: 956, inset: 62 },
];

const html = readFileSync('index.html', 'utf8');

/** The boot markup and its styles, lifted out of index.html verbatim. */
function bootSource() {
  const open = html.indexOf('<div id="boot">');
  const close = html.indexOf('</style>', open);
  if (open < 0 || close < 0)
    throw new Error('could not find #boot in index.html');
  return html.slice(open, close + '</style>'.length);
}

const page = (inset) => `<!doctype html>
<meta charset="utf-8" />
<style>
  /* The band the status bar owns: whatever html/body paint on the phone. */
  html, body { margin: 0; height: 100%; background: #100408; }
  /* The band the status bar owns, and the box the web view actually gets. */
  #view { position: fixed; left: 0; right: 0; top: ${inset}px; bottom: 0; overflow: hidden; }
  #view #boot { position: absolute; }
</style>
<div id="view">${bootSource()}</div>`;

const browser = await chromium.launch({ executablePath: CHROME });
for (const d of DEVICES) {
  const ctx = await browser.newContext({
    viewport: { width: d.width, height: d.height },
    deviceScaleFactor: 3,
  });
  const p = await ctx.newPage();
  await p.setContent(page(d.inset), { waitUntil: 'load' });
  await p.waitForTimeout(150);
  const out = `public/icons/splash/${d.name}.png`;
  await p.screenshot({ path: out });
  console.log(
    `${out}  ${d.width * 3}x${d.height * 3}  status bar ${d.inset}pt`
  );
  await ctx.close();
}
await browser.close();

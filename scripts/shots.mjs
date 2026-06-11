import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/katitos-shots';
mkdirSync(OUT, { recursive: true });

const routes = [
  ['login', null],
  ['home', '/'],
  ['tree', '/tree'],
  ['album', '/album'],
  ['polaroid', '/polaroid'],
  ['wall', '/wall'],
  ['know-me', '/know-me'],
  ['dates', '/dates'],
  ['georgia', '/georgia'],
  ['games', '/games'],
  ['flowers', '/flowers'],
  ['quizzes', '/quizzes'],
  ['together', '/together'],
  ['timezone', '/timezone'],
];

const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 430, height: 932 }, // iPhone-ish
  deviceScaleFactor: 2,
});
const p = await ctx.newPage();
const base = 'http://localhost:5173';

// login screen first (anon)
await p.goto(base + '/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/00-login.png` });

// sign in
try {
  await p.fill('input[type="email"]', 'vicente@katitos.local');
  await p.fill('input[type="password"]', 'katitos123');
  await p.getByRole('button', { name: /enter|sign|login|entrar/i }).first().click();
  await p.waitForTimeout(2500);
} catch (e) {
  console.log('login interaction issue:', e.message);
}

let i = 1;
for (const [name, path] of routes) {
  if (!path) continue;
  try {
    await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(1400);
    await p.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}-${name}.png` });
    console.log('shot', name);
  } catch (e) {
    console.log('fail', name, e.message);
  }
  i++;
}
await b.close();
console.log('DONE', OUT);

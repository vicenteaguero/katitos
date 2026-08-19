/*
 * "Is what I have here the same as what is live?" — answered in one command.
 *
 *   npm run prod:version            → against katitos.vercel.app
 *   npm run prod:version -- <url>   → against any deployment
 *
 * Reads the stamp the deploy is serving (public/version.json, written at build
 * time by stamp-build.mjs) and lines it up with this working copy.
 */
import { execSync } from 'node:child_process';

const SITE = process.argv[2] || process.env.KATITOS_URL || 'https://katitos.vercel.app';

function git(args, fallback = '') {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const local = {
  sha: git('rev-parse HEAD'),
  ref: git('rev-parse --abbrev-ref HEAD'),
  subject: git('log -1 --format=%s'),
  // Same scope as the stamp: only what the bundle is built from counts.
  dirty:
    git('status --porcelain -- src public index.html vite.config.ts package.json')
      .length > 0,
};

let prod;
try {
  const res = await fetch(`${SITE}/version.json?t=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // The SPA rewrite hands back index.html for anything missing, so a stampless
  // deploy answers 200 with HTML rather than a 404. Say so plainly.
  if (!res.headers.get('content-type')?.includes('json')) {
    console.error(
      `${SITE} is running a build made before the version stamp existed — push once and this works.`
    );
    process.exit(2);
  }
  prod = await res.json();
} catch (err) {
  console.error(`could not read ${SITE}/version.json — ${err.message}`);
  process.exit(2);
}

const row = (label, sha, ref, extra) =>
  `${label.padEnd(6)} ${String(sha).slice(0, 7)}  ${String(ref).padEnd(14)} ${extra}`;

console.log(row('local', local.sha, local.ref, local.subject));
console.log(
  row('prod', prod.sha, prod.ref, `${prod.subject}  · built ${prod.builtAt}`)
);
console.log('');

if (local.dirty) {
  console.log('! this working copy has uncommitted changes');
}

if (prod.sha === local.sha) {
  console.log(
    local.dirty
      ? '~ same commit as production, plus your uncommitted changes'
      : '✓ identical — production is running exactly this commit'
  );
  process.exit(0);
}

// `git rev-list` only works if we actually have that commit locally.
const known = git(`cat-file -t ${prod.sha}`, '') === 'commit';
if (!known) {
  console.log(
    `✗ different commits, and ${String(prod.sha).slice(0, 7)} is not in this clone — fetch first`
  );
  process.exit(1);
}

const ahead = git(`rev-list --count ${prod.sha}..HEAD`, '?');
const behind = git(`rev-list --count HEAD..${prod.sha}`, '?');
console.log(
  `✗ different — you are ${ahead} commit(s) ahead of production, ${behind} behind`
);
if (ahead !== '0' && ahead !== '?') {
  console.log('\nnot deployed yet:');
  console.log(git(`log --oneline ${prod.sha}..HEAD`));
}
process.exit(1);

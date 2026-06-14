/**
 * scripts/audit-lighthouse.js
 * Builds the Astro site, spins up a static server, runs Lighthouse audits,
 * asserts all category scores are >= 0.95, then tears down cleanly.
 *
 * Usage: node scripts/audit-lighthouse.js
 * Or via package.json: npm run audit
 */

import { execSync, spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const PORT = 5876;
const BASE_URL = `http://localhost:${PORT}`;
const PASS_THRESHOLD = 0.95;
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

let serverProcess = null;

function cleanup() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    console.log('[audit] Static server stopped.');
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

async function main() {
  // 1. Build
  console.log('[audit] Building Astro site…');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('[audit] Build complete.');

  // 2. Start static server
  console.log(`[audit] Starting static server on port ${PORT}…`);
  serverProcess = spawn(
    'npx', ['serve', '-s', 'dist', '-l', String(PORT), '--no-clipboard'],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: true }
  );

  serverProcess.stdout.on('data', (d) => process.stdout.write(d));
  serverProcess.stderr.on('data', (d) => process.stderr.write(d));

  // Wait for server to be ready
  await sleep(3000);

  // 3. Run Lighthouse
  console.log('[audit] Running Lighthouse…');
  let output;
  try {
    output = execSync(
      `npx lighthouse ${BASE_URL} --output=json --quiet --chrome-flags="--headless --no-sandbox --disable-gpu"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (err) {
    // lighthouse exits non-zero even on warn; try to parse stdout
    output = err.stdout || '';
    if (!output) {
      console.error('[audit] Lighthouse failed to produce output:', err.message);
      process.exit(1);
    }
  }

  // 4. Parse & assert
  let report;
  try {
    report = JSON.parse(output);
  } catch {
    console.error('[audit] Could not parse Lighthouse JSON output.');
    process.exit(1);
  }

  const { categories } = report;
  let allPassed = true;

  console.log('\n[audit] Lighthouse Results:');
  console.log('─'.repeat(45));

  for (const cat of CATEGORIES) {
    const score = categories[cat]?.score ?? 0;
    const pct = Math.round(score * 100);
    const pass = score >= PASS_THRESHOLD;
    if (!pass) allPassed = false;
    console.log(`  ${pass ? '✅' : '❌'} ${cat.padEnd(20)} ${pct}/100`);
  }

  console.log('─'.repeat(45));

  if (allPassed) {
    console.log('[audit] ✅  All categories passed (≥ 95). Exiting 0.\n');
    process.exit(0);
  } else {
    console.error('[audit] ❌  One or more categories failed. Exiting 1.\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[audit] Unexpected error:', err);
  process.exit(1);
});

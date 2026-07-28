#!/usr/bin/env node
// check-links.mjs — verify all external URLs in the built site respond healthy
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

const dist = join(process.cwd(), 'dist');
if (!existsSync(dist)) {
  console.error('❌ dist/ not found. Run `astro build` first.');
  process.exit(1);
}

const urls = new Set();
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.html')) {
      const html = readFileSync(p, 'utf-8');
      for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) urls.add(m[1]);
    }
  }
}
walk(dist);

const results = await Promise.allSettled(
  [...urls].map(async url => {
    try {
      const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
      return { url, ok: resp.ok, status: resp.status };
    } catch {
      return { url, ok: false, status: 'FETCH_ERR' };
    }
  }),
);

let bad = 0;
for (const r of results) {
  const { url, ok, status } = r.value;
  if (!ok) {
    console.log(`  ❌ ${status}  ${url}`);
    bad++;
  } else {
    console.log(`  ✓ ${status}  ${url}`);
  }
}

if (bad) {
  console.log(`\n❌ ${bad} broken link(s) found`);
  process.exit(1);
} else {
  console.log(`\n✓ All ${results.length} links OK`);
}

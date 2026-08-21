#!/usr/bin/env node
// check-links.mjs — verify all external URLs in the built site respond healthy
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

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

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

// Cloudflare WAF returns 403 to automated requests.
const WAF_PROTECTED = [
  'ijicom.respati.ac.id',
  'dicoding.com',
  'univ.mekari.com',
  'linkedin.com',
];

// Hosts that only resolve on the home LAN (no public DNS). Linked on the
// portfolio as "live demo" but unreachable from outside — skip, don't flag.
const LOCAL_ONLY = [
  'home.alkamfrz.id',
];

function isWafProtected(url) {
  try {
    return WAF_PROTECTED.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isLocalOnly(url) {
  try {
    return LOCAL_ONLY.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

const results = await Promise.allSettled(
  [...urls].map(async url => {
    try {
      if (isLocalOnly(url)) {
        return { url, ok: true, status: 'local-only' };
      }
      const resp = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': UA },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });
      // Some sites reject HEAD — retry as GET on 403/405
      if (resp.status === 403 || resp.status === 405) {
        if (isWafProtected(url)) {
          return { url, ok: true, status: '403 (WAF — skipped)' };
        }
        const getResp = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': UA },
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        });
        return { url, ok: getResp.ok, status: getResp.status };
      }
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

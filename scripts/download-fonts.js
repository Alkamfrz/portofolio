import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, '..', 'public', 'fonts');

if (!existsSync(fontsDir)) mkdirSync(fontsDir, { recursive: true });

const fontFamilies = [
  {
    name: 'Inter',
    variants: [
      { weight: 400, url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2' },
      { weight: 700, url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2' },
    ]
  }
];

async function downloadFont(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buffer);
  console.log(`  ✓ ${dest.split('/').pop()}`);
}

async function main() {
  console.log('Downloading fonts...');
  for (const family of fontFamilies) {
    console.log(`\n${family.name}:`);
    for (const variant of family.variants) {
      const filename = `${family.name.toLowerCase()}-${variant.weight}.woff2`;
      const dest = join(fontsDir, filename);
      if (existsSync(dest)) {
        console.log(`  - ${filename} (cached)`);
        continue;
      }
      try {
        await downloadFont(variant.url, dest);
      } catch (e) {
        console.log(`  ✗ ${filename}: ${e.message}`);
      }
    }
  }

  // Generate @font-face CSS
  let css = '/* Self-hosted fonts */\n';
  for (const family of fontFamilies) {
    for (const variant of family.variants) {
      css += `@font-face {
  font-family: '${family.name}';
  font-style: normal;
  font-weight: ${variant.weight};
  font-display: swap;
  src: url('/fonts/${family.name.toLowerCase()}-${variant.weight}.woff2') format('woff2');
}\n\n`;
    }
  }
  writeFileSync(join(fontsDir, 'fonts.css'), css);
  console.log(`\n✓ fonts.css generated at public/fonts/fonts.css`);
  console.log(`✓ ${fontFamilies.reduce((a, f) => a + f.variants.length, 0)} font files downloaded`);
}

main().catch(console.error);

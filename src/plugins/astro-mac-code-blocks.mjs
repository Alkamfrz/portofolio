import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

async function* walkHtml(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fp = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkHtml(fp);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield fp;
    }
  }
}

export default function astroMacCodeBlocks() {
  return {
    name: 'astro-mac-code-blocks',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = typeof dir === 'string' ? dir : fileURLToPath(dir);
        const files = [];
        for await (const fp of walkHtml(root)) {
          files.push(fp);
        }
        await Promise.all(files.map(async (fp) => {
          let html = await readFile(fp, 'utf-8');
          const original = html;
          html = html.replace(/<pre(?:\s+[^>]*)?>[\s\S]*?<\/pre>/g, (match) => {
            const langMatch = match.match(/data-language="([^"]*)"/);
            const lang = langMatch ? langMatch[1] : 'code';
            const header = `<div class="mac-code-header"><div class="mac-dots"><span class="mac-dot red"></span><span class="mac-dot yellow"></span><span class="mac-dot green"></span></div><span class="mac-lang">${lang}</span><button class="mac-copy-btn" data-copy="">Copy</button></div>`;
            return `<div class="mac-code-block">${header}${match}</div>`;
          });
          if (html !== original) {
            await writeFile(fp, html, 'utf-8');
          }
        }));
      },
    },
  };
}

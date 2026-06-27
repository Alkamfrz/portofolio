// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import astroMacCodeBlocks from './src/plugins/astro-mac-code-blocks.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://alkamfrz.id',
  output: 'static',
  integrations: [sitemap(), astroMacCodeBlocks()],
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: {
    defaultStrategy: 'viewport',
  },
  build: {
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});

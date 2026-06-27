// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import astroMacCodeBlocks from './src/plugins/astro-mac-code-blocks.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://alkamfrz.id',
  output: 'static',
  integrations: [sitemap(), astroMacCodeBlocks()],
  prefetch: {
    defaultStrategy: 'viewport',
  },
  build: {
    inlineStylesheets: 'always',
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

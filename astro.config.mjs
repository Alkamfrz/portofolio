// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import astroMacCodeBlocks from './src/plugins/astro-mac-code-blocks.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://alkamfrz.my.id',
  output: 'static',
  adapter: cloudflare({
    mode: 'advanced',
  }),
  integrations: [react(), sitemap(), astroMacCodeBlocks()],
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
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://alkamfrz.my.id',
  output: 'static',
  integrations: [react(), sitemap()],
  prefetch: true,
  build: {
    inlineStylesheets: 'always',
  },
});
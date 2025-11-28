import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://scash-halving-countdown.vercel.app',
  output: 'server',
  adapter: vercel(),
  integrations: [
    tailwind(),
    sitemap()
  ],
});
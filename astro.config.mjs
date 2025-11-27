// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // site: 'https://tu-dominio.com', // Descomentar y configurar cuando tengas el dominio
  integrations: [
    tailwind(),
    sitemap()
  ],
});
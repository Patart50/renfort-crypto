import { svelte } from '@sveltejs/vite-plugin-svelte';
import { offlineServiceWorker } from 'commun-crypto/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // Chemins relatifs : fonctionne à la racine d'un domaine comme sous /renfort-crypto/ (GitHub Pages).
  base: './',
  // Service worker hors ligne généré au build (commun-crypto).
  plugins: [svelte(), offlineServiceWorker({ name: 'renfort-crypto' })],
  define: { __APP_VERSION__: JSON.stringify(version) },
});

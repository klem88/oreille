import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import yamlImport from '@rollup/plugin-yaml'

// Les types du plugin (CJS, export =) ne sont pas appelables sous module nodenext : on les contourne.
const yaml = yamlImport as unknown as typeof yamlImport.default

const sampleCache = (cacheName: string, urlPattern: RegExp) => ({
  urlPattern,
  handler: 'CacheFirst' as const,
  options: {
    cacheName,
    cacheableResponse: { statuses: [0, 200] },
    expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
  },
})

// https://vite.dev/config/
export default defineConfig({
  // chemins relatifs : l'app fonctionne à la racine (Vercel) comme sous un sous-chemin (GitHub Pages)
  base: './',
  plugins: [
    svelte(),
    yaml(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Oreille',
        short_name: 'Oreille',
        description: "Entraînement de l'oreille harmonique",
        lang: 'fr',
        display: 'standalone',
        theme_color: '#121216',
        background_color: '#121216',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          sampleCache('samples-piano', /^https:\/\/tonejs\.github\.io\/.*/i),
          sampleCache('samples-guitare', /^https:\/\/nbrosowsky\.github\.io\/.*/i),
        ],
      },
    }),
  ],
})

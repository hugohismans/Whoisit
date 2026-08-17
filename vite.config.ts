import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

/**
 * En production, index.html embarque une CSP stricte avec `connect-src 'none'`.
 * C'est la garantie auditable du projet : le navigateur lui-même interdit toute
 * sortie réseau. Mais elle bloque aussi le websocket HMR de Vite en dev.
 *
 * Ce plugin relâche UNIQUEMENT en dev, et uniquement `connect-src`, pour laisser
 * passer le HMR local. Le HTML livré (`vite build`) n'est jamais touché.
 */
function relaxCspInDev(): Plugin {
  return {
    name: 'whoisit:relax-csp-in-dev',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        /connect-src 'none'/,
        "connect-src 'self' ws: wss:",
      )
    },
  }
}

// Base path : GitHub Pages sert le site sous /<repo>/.
// Surchargeable via BASE_PATH pour un déploiement à la racine / domaine custom.
const base = process.env.BASE_PATH ?? '/Whoisit/'

export default defineConfig({
  base,
  plugins: [tailwindcss(), svelte(), relaxCspInDev()],
  worker: {
    // ESM : le worker est émis comme fichier séparé du bundle, servi par 'self'.
    format: 'es',
  },
  build: {
    target: 'es2022',
    // Le polyfill modulepreload de Vite appelle fetch() sur nos propres assets.
    // Sous `connect-src 'none'` il serait bloqué — et il est de toute façon inutile
    // sur les navigateurs qui supportent es2022. On le retire pour que le bundle
    // ne contienne littéralement aucune primitive réseau (vérifié par `npm run audit`).
    modulePreload: { polyfill: false },
    // Aucun asset n'est inliné en data: URI au-delà de 4 ko (garde le HTML lisible/auditable).
    assetsInlineLimit: 4096,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
})

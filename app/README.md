# Oreille

Application web (PWA) d'entraînement de l'oreille harmonique : on identifie des degrés et des accords après une cadence d'ancrage, par paliers progressifs (A à D pour l'instant), avec répétition espacée.
Installable et utilisable hors ligne une fois les sons (piano, guitare) chargés ; sans réseau, les questions sont jouées à la nappe.

## Développement

```
npm install
npm run dev        # http://localhost:5174 (config « app » de .claude/launch.json)
npm test           # tests unitaires (vitest)
npm run check      # svelte-check + tsc
npm run build      # produit dist/ (service worker inclus)
npm run preview    # sert dist/ pour tester la PWA (config « app-preview », port 4174)
```

Les icônes PWA sont générées par `node scripts/make-icons.mjs` (sans dépendance) vers `public/icons/`.

## Déploiement

En ligne : https://klem88.github.io/oreille/ (GitHub Pages). Chaque push sur `main` relance les tests, construit et publie l'app (`.github/workflows/pages.yml`).

## Autres options de déploiement

L'app utilise des chemins relatifs (`base: './'`) : elle fonctionne à la racine d'un domaine comme sous un sous-chemin.

### Vercel

```
npm i -g vercel
vercel          # déploiement de prévisualisation, depuis app/ (répertoire de sortie : dist)
vercel --prod   # production
```

Réglages du projet : commande de build `npm run build`, répertoire de sortie `dist`.

### GitHub Pages

```
npm run build
npx gh-pages -d dist
```

Ou un workflow GitHub Pages qui exécute `npm ci && npm run build` dans `app/` et publie `app/dist`.

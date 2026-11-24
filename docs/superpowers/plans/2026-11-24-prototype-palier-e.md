# Prototype jetable palier E — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** une page unique qui joue une cadence d'ancrage puis une progression de 4 accords dans une tonalité aléatoire, laisse l'utilisateur saisir 4 degrés, et révèle la réponse avec la roue de gravité et la timeline, pour tester l'audio mobile et l'utilité de la visualisation.

**Architecture :** app Svelte 5 + Vite dans `proto/`, sans persistance, sans routeur, sans PWA. Trois modules : théorie (degrés → accords → notes), audio (Tone.js), interface (une page, une machine à états). Le code est **jeté** à la fin ; seules les conclusions sont reportées dans le cahier de conception.

**Tech Stack :** Svelte 5, Vite, TypeScript, Tone.js 15, tonal (`tonal` meta-package).

**Spec :** `docs/superpowers/specs/2026-11-24-oreille-design.md`, section 7.4 (et 5.2 palier E, 6.1, 6.3 pour le contenu).

## Global Constraints

- Prototype jetable : pas de tests automatisés, pas de persistance, pas de PWA (spec 7.4).
- Palier E uniquement, mode majeur, piano seul (spec 7.4).
- Progressions du palier E : I-V-vi-IV, vi-IV-I-V, IV-I-V-vi, I-vi-IV-V, I-IV-V-I, I-iii-IV-V, ii-V-I-vi, I-vi-ii-V (spec 5.2).
- Cadence d'ancrage : I-IV-V-I (spec 5.1.1).
- Tonalité tirée au sort parmi les 12 à chaque question (spec 5.1.4).
- Couleurs des degrés, convention Hooktheory : I rouge, ii orange, iii jaune, IV vert, V bleu, vi violet, vii indigo (spec 6.1). Chiffres romains toujours affichés.
- Ordre entendre → nommer → vérifier : au plus 2 réécoutes, aucune visualisation avant la révélation (spec 5.1.2, 6).
- Audio déclenché par un geste utilisateur (iOS).
- Interface en français, utilisable d'une main sur téléphone.

## Review Focus

Prototype : pas de tests, cette liste sert de grille d'observation à la tâche 6.

- Premier tap sur iOS Safari : le son doit sortir dès le premier « Nouvelle question », sans écran muet.
- Deux taps rapides sur « Nouvelle question » : la deuxième progression ne doit pas se superposer à la première.
- Samples non encore chargés : le bouton doit attendre le chargement (état « chargement… »), pas jouer du silence.
- Les 4 degrés sont saisis mais l'utilisateur veut corriger le dernier : un bouton « effacer » retire la dernière saisie.
- Écran en 360 px de large : six boutons de degrés et quatre cases visibles sans défilement.

---

### Task 1 : Squelette du projet

**Files :**
- Create : `proto/` (via `npm create vite`), `proto/package.json`, `.gitignore` racine

**Interfaces :**
- Produces : projet Svelte 5 + TS démarrable avec `npm run dev`, dépendances `tone` et `tonal` installées.

- [ ] **Step 1 : initialiser git à la racine du projet**

```powershell
git init
```

Créer `.gitignore` racine contenant `node_modules/`, `dist/`, `.DS_Store`.

- [ ] **Step 2 : créer l'app Vite**

```powershell
npm create vite@latest proto -- --template svelte-ts
```

Puis dans `proto/` : `npm install` et `npm install tone tonal`.

- [ ] **Step 3 : vider le gabarit**

Supprimer `proto/src/lib/Counter.svelte`, `proto/src/assets/svelte.svg`, le contenu de `proto/src/app.css` ; remplacer `App.svelte` par un `<h1>Oreille — prototype</h1>`.

- [ ] **Step 4 : vérifier**

Run : `npm run dev` dans `proto/`
Expected : la page affiche le titre, aucune erreur console.

- [ ] **Step 5 : commit**

```bash
git add .gitignore proto docs
git commit -m "chore: squelette du prototype palier E et cahier de conception"
```

---

### Task 2 : Module théorie

**Files :**
- Create : `proto/src/lib/theory.ts`

**Interfaces :**
- Produces :
  - `type Degree = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii'`
  - `const DEGREES: Degree[]` (les six premiers suffisent aux boutons ; vii est dans le type pour la roue)
  - `const PROGRESSIONS: Degree[][]` (les 8 du palier E, valeurs de la spec 5.2)
  - `const KEYS: string[]` (`['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']`)
  - `const CADENCE: Degree[]` = `['I','IV','V','I']`
  - `randomKey(): string`
  - `randomProgression(): Degree[]`
  - `chordNotes(key: string, degree: Degree): string[]` — notes avec octave, triade en position fermée dans l'octave 4, basse doublée à l'octave 3 (ex. `chordNotes('C','V')` → `['G3','G4','B4','D5']`)
  - `chordName(key: string, degree: Degree): string` — ex. `chordName('C','vi')` → `'Am'`
  - `DEGREE_COLORS: Record<Degree, string>` — hex Hooktheory : I `#e4383a`, ii `#f08a2b`, iii `#f2d13d`, IV `#4caf50`, V `#2f80ed`, vi `#8e5bd6`, vii `#4b3fa8`

- [ ] **Step 1 : écrire `theory.ts`**

Utiliser `Progression.fromRomanNumerals(key, degrees)` de tonal pour obtenir les noms d'accords, puis `Chord.get(name).notes` pour les hauteurs. Les degrés en minuscules donnent des accords mineurs via tonal ; vérifier que `vii` produit bien un accord diminué (`Chord.get('Bdim')`) sinon le forcer.

- [ ] **Step 2 : vérifier à la console**

Dans `App.svelte`, en `onMount`, `console.log(chordNotes('C','V'), chordName('C','vi'), chordNotes('Eb','ii'))`.
Expected : `['G3','G4','B4','D5']`, `'Am'`, `['F3','F4','Ab4','C5']`.

- [ ] **Step 3 : commit**

```bash
git add proto/src/lib/theory.ts
git commit -m "feat(proto): module théorie degrés → accords"
```

---

### Task 3 : Module audio

**Files :**
- Create : `proto/src/lib/audio.ts`

**Interfaces :**
- Consumes : `chordNotes`, `CADENCE` de la tâche 2.
- Produces :
  - `loadPiano(): Promise<void>` — crée un `Tone.Sampler` Salamander (URLs `https://tonejs.github.io/audio/salamander/`, notes A0 à C8 par tierces mineures, comme l'exemple officiel Tone.js), résout quand chargé ; idempotent.
  - `unlock(): Promise<void>` — `Tone.start()`, à appeler dans le gestionnaire de tap.
  - `playSequence(chords: string[][], bpm: number, onChord?: (index: number) => void): Promise<void>` — joue chaque accord une mesure (4 temps) au tempo donné, appelle `onChord(i)` au début de chaque accord, résout à la fin ; annule toute séquence en cours avant de démarrer (`Tone.Transport.cancel()` + `stop()`).
  - `stop(): void`

- [ ] **Step 1 : écrire `audio.ts`**

Programmer avec `Tone.Transport.schedule` et `sampler.triggerAttackRelease(notes, '1m', time)`. Tempo de la cadence : 90 bpm ; la progression reçoit son tempo en paramètre (tirage entre 70 et 100 dans la tâche 4).

- [ ] **Step 2 : vérifier**

Bouton temporaire dans `App.svelte` : `await unlock(); await loadPiano(); await playSequence(CADENCE.map(d => chordNotes('C', d)), 90)`.
Expected : I-IV-V-I en Do audible au piano, sans clic, aucune erreur console.

- [ ] **Step 3 : commit**

```bash
git add proto/src/lib/audio.ts
git commit -m "feat(proto): lecture d'accords Tone.js"
```

---

### Task 4 : Page d'exercice

**Files :**
- Create : `proto/src/lib/Exercise.svelte`
- Modify : `proto/src/App.svelte`, `proto/src/app.css`

**Interfaces :**
- Consumes : tâches 2 et 3.
- Produces : état exporté aux composants de la tâche 5 via props : `progression: Degree[]`, `answer: Degree[]`, `revealed: boolean`, `currentIndex: number` (accord en cours de lecture, -1 sinon).

- [ ] **Step 1 : machine à états**

`type Phase = 'idle' | 'loading' | 'playing' | 'answering' | 'revealed'`. Transitions :
- `idle` → tap « Nouvelle question » → `unlock()`, `loadPiano()` (`loading` tant que non chargé) → tirer `key`, `progression`, `bpm` → jouer cadence puis, après une pause de 1 s, la progression (`playing`) → `answering`.
- `answering` : boutons des six degrés remplissent `answer` (max 4) ; « Effacer » retire le dernier ; « Réécouter » rejoue la progression seule, 2 fois maximum, compteur affiché ; « Révéler » actif quand `answer.length === 4`.
- `revealed` : affiche par case ✓/✗, nom de la tonalité, noms d'accords (`chordName`), bouton « Réécouter » illimité, bouton « Nouvelle question ».

- [ ] **Step 2 : interface**

Disposition verticale : en haut la zone de visualisation (vide avant révélation, la tâche 5 la remplit), au milieu quatre cases de réponse, en bas une grille 3 × 2 de boutons de degrés colorés (`DEGREE_COLORS` en fond, chiffre romain en noir ou blanc selon contraste), puis la rangée Effacer / Réécouter / Révéler. Boutons d'au moins 56 px de haut. Largeur max 480 px centrée. Pendant `playing`, les boutons de degrés sont désactivés.

- [ ] **Step 3 : vérifier sur ordinateur**

Run : `npm run dev`
Expected : cycle complet Nouvelle question → écoute → 4 saisies → Révéler → ✓/✗ corrects par rapport à la progression tirée (vérifier avec un `console.log(progression)`), Réécouter limité à 2 avant révélation.

- [ ] **Step 4 : commit**

```bash
git add proto/src
git commit -m "feat(proto): page d'exercice palier E"
```

---

### Task 5 : Roue de gravité et timeline

**Files :**
- Create : `proto/src/lib/Wheel.svelte`, `proto/src/lib/Timeline.svelte`
- Modify : `proto/src/lib/Exercise.svelte` (insertion dans la zone de visualisation, visible uniquement en `revealed`)

**Interfaces :**
- Consumes : props `progression`, `currentIndex`, `DEGREE_COLORS`.

- [ ] **Step 1 : `Wheel.svelte`**

SVG `viewBox="0 0 300 300"`. I au centre (cercle r = 30). Les six autres degrés sur un cercle de rayon 110, positions angulaires (0° = droite, sens horaire) : V 0°, iii 60°, vii 120°, ii 180°, vi 240°, IV 300° (V à droite, IV à gauche, spec 6.3). Chaque degré : cercle r = 22 de sa couleur, chiffre romain centré. La progression est tracée en polyline reliant les centres dans l'ordre, trait gris 3 px ; le segment menant à l'accord `currentIndex` est épais et de la couleur de l'accord cible, les accords déjà joués ont un halo. Le V porte en permanence une flèche fine vers le centre (l'élastique). Transition Svelte `draw`/`fade` à l'apparition.

- [ ] **Step 2 : `Timeline.svelte`**

Quatre blocs horizontaux de largeur égale, couleur du degré, chiffre romain, le bloc `currentIndex` surélevé de 4 px avec bordure blanche. Rangée de 48 px de haut.

- [ ] **Step 3 : brancher dans `Exercise.svelte`**

En `revealed`, « Réécouter » met à jour `currentIndex` via le callback `onChord` de `playSequence`, ce qui anime roue et timeline en synchronisation avec le son. Avant révélation, la zone reste vide (un simple texte « Écoute… » pendant `playing`).

- [ ] **Step 4 : vérifier**

Expected : à la révélation, roue et timeline apparaissent ; « Réécouter » fait avancer le fil et le bloc en rythme avec les accords.

- [ ] **Step 5 : commit**

```bash
git add proto/src/lib
git commit -m "feat(proto): roue de gravité et timeline"
```

---

### Task 6 : Essai sur téléphone et conclusions

**Files :**
- Modify : `docs/superpowers/specs/2026-11-24-oreille-design.md` (ajouter une section « 7.5 Conclusions du prototype »)

- [ ] **Step 1 : servir sur le réseau local**

Run : `npm run dev -- --host` dans `proto/`, ouvrir l'URL LAN sur le téléphone (iOS Safari et, si disponible, Android Chrome).

- [ ] **Step 2 : passer la grille d'observation**

Pour chaque ligne de « Review Focus » : noter OK / KO et le symptôme. Ajouter : latence perçue entre tap et son, temps de chargement des samples en 4G et en wifi, taille des boutons à une main.

- [ ] **Step 3 : essai pédagogique, l'utilisateur seul**

Vingt questions au casque. Noter : score, et pour chaque erreur si la roue à la révélation a aidé à comprendre l'erreur, n'a rien apporté, ou a distrait. Noter aussi si la cadence d'ancrage est assez longue et si 2 réécoutes suffisent.

- [ ] **Step 4 : reporter dans le cahier**

Section « 7.5 Conclusions du prototype » : résultats de la grille, verdict sur la roue (garder / modifier / remplacer par la seule timeline), ajustements des paramètres (tempo, réécoutes, durée de cadence), problèmes audio à traiter dans l'app.

- [ ] **Step 5 : commit**

```bash
git add docs/superpowers/specs/2026-11-24-oreille-design.md
git commit -m "docs: conclusions du prototype palier E"
```

Le dossier `proto/` est conservé dans l'historique mais n'est pas réutilisé : l'app se construit dans un plan séparé, à partir du cahier mis à jour.

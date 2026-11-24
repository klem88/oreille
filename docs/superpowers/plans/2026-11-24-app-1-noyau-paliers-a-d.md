# Oreille, sous-projet 1 : noyau et paliers A à D — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** une PWA installable, hors ligne, qui fait travailler les paliers A (fonction parmi I, IV, V, vi), B (sept degrés, triades puis septièmes, majeur et mineur), C (renversements, étape chantée) et D (progressions de 2 accords générées), avec séries courtes, répétition espacée, déblocage, et la révélation riche validée par le prototype.

**Architecture :** app Svelte 5 + Vite + TypeScript dans `app/`, sans backend. Quatre couches : `theory` (grammaire des degrés, accords, voicings, générateur), `audio` (Tone.js, port corrigé du prototype), `engine` (questions, Leitner, séries, déblocage, persistance IndexedDB), `ui` (écrans et vues). Le contenu pédagogique (paramètres des paliers) est en YAML dans `app/src/content/`, validé par un schéma au chargement.

**Tech Stack :** Svelte 5, Vite, TypeScript, Tone.js 15, tonal 6, idb, zod, `@rollup/plugin-yaml`, `vite-plugin-pwa`, Vitest, `fake-indexeddb`.

**Spec :** `docs/superpowers/specs/2026-11-24-oreille-design.md`. Sections qui pilotent ce plan : 5.1, 5.2 (A à D), 5.4, 5.5, 5.6, 5.7, 6, 7. Le prototype `proto/` est une référence de comportement (UX des trois étapes, vues), pas une base de code : on ne copie que `audio.ts` corrigé et la logique de `voiceProgression`.

## Global Constraints

- Audio déclenché par un geste utilisateur ; `unlock()` appelé de façon synchrone dans le gestionnaire de tap (spec 3, 7.5).
- Fin de séquence calée sur l'horloge audio, jamais sur requestAnimationFrame ; jeton de génération pour ignorer les callbacks d'une séquence annulée (spec 7.5).
- Couleurs des degrés : I `#e4383a`, ii `#f08a2b`, iii `#f2d13d`, IV `#4caf50`, V `#2f80ed`, vi `#8e5bd6`, vii `#4b3fa8` ; degrés altérés : couleur du degré de base, motif hachuré (spec 6.1).
- Chiffres romains toujours affichés ; nom d'accord à la révélation ; la grammaire distingue ø et ° (spec 5.5, 6.1).
- Série = 8 questions : 6 du palier en cours + 2 rappels ; seuls les 6 comptent ; déblocage à deux séries consécutives ≥ 85 % **ou** 6 réussites d'affilée ; paramètres dans `content/paliers/*.yaml` (spec 5.6, 5.7.1).
- Tonalité tirée parmi les 12, timbre parmi piano / guitare / nappe, registre et tempo variés à chaque question (spec 5.1.4).
- Aucune visualisation avant la réponse, sauf option « guidé » aux paliers A et B (spec 6).
- Tout accord ou note affiché après la réponse est réécoutable au tap (spec 6.6).
- Interface en français, utilisable d'une main, séries de 3 à 5 minutes, hors ligne après première visite.
- Tests unitaires Vitest sur `theory` et `engine` ; `audio` et `ui` vérifiés dans le navigateur.

## Review Focus

- Une tonalité en bémols (Gb) au palier B, degré IV : l'accord doit s'afficher « Cb » simplifié en « B » et sonner juste (spec 7.5, enharmonies). Test ajouté en tâche 3.
- Verrouillage de l'écran pendant une lecture, puis retour : l'app ne doit pas rester figée sur « Écoute… » ; un bouton « Passer » reste disponible et le Transport repart ou la question est annulée proprement. Vérifié en tâche 5 (navigateur) et tâche 10.
- Série interrompue (fermeture de l'app à la question 4) : à la réouverture, la série reprend à la question 4 ou repart de zéro, mais jamais dans un état incohérent (compteur, Leitner). Test ajouté en tâche 8.
- Palier C avec un accord de septième renversé : la réponse « basse = septième » doit exister et être corrigée (spec 5.2 C). Test ajouté en tâche 7.
- Premier lancement hors ligne (samples non mis en cache) : message clair « connecte-toi une fois pour charger les sons », pas un écran de chargement infini. Vérifié en tâche 11.

---

### Task 1 : Squelette de l'app et outillage de test

**Files :**
- Create : `app/` (Vite svelte-ts), `app/vite.config.ts`, `app/vitest.config.ts`, `app/src/content/.gitkeep`
- Modify : `.gitignore` racine (déjà `node_modules/`, `dist/`)

**Interfaces :**
- Produces : `npm test` (Vitest) et `npm run dev` fonctionnels dans `app/` ; plugins yaml et pwa installés mais non configurés (tâche 11 pour la PWA).

- [ ] **Step 1 : créer le projet**

```powershell
npm create vite@latest app -- --template svelte-ts
```

Dans `app/` : `npm install`, puis `npm install tone tonal idb zod` et `npm install -D vitest fake-indexeddb @rollup/plugin-yaml vite-plugin-pwa @types/node`.

- [ ] **Step 2 : configurer Vitest et le plugin YAML**

`vite.config.ts` : ajouter `yaml()` de `@rollup/plugin-yaml` aux plugins. `vitest.config.ts` : `environment: 'node'`, `include: ['src/**/*.test.ts']`, `setupFiles: ['src/test/setup.ts']` où `setup.ts` fait `import 'fake-indexeddb/auto'`. Script `"test": "vitest run"` dans `package.json`.

- [ ] **Step 3 : écrire un test témoin**

`app/src/test/smoke.test.ts` : `expect(1 + 1).toBe(2)`.

- [ ] **Step 4 : vérifier**

Run : `npm test` dans `app/`
Expected : 1 passed.

- [ ] **Step 5 : vider le gabarit et commit**

Supprimer `Counter.svelte`, `svelte.svg` ; `App.svelte` affiche « Oreille ».

```bash
git add app
git commit -m "chore(app): squelette Svelte + Vitest + plugins yaml/pwa"
```

---

### Task 2 : Grammaire des degrés

**Files :**
- Create : `app/src/lib/theory/degree.ts`, `app/src/lib/theory/degree.test.ts`

**Interfaces :**
- Produces :
  - `type Quality = 'maj' | 'min' | 'dim' | 'aug' | '7' | 'maj7' | 'm7' | 'ø7' | '°7' | '6'`
  - `interface Degree { step: 1|2|3|4|5|6|7; accidental: -1|0|1; quality: Quality; bass: 1|3|5|7; secondaryOf?: Degree; label: string }`
  - `parseDegree(text: string): Degree` — accepte `I`, `ii`, `V7`, `viiø7`, `vii°7`, `bVII`, `#iv°7`, `I/3`, `V7/V`, `IVmaj7`, `I6`, `V+`. Lance `DegreeSyntaxError` sinon.
  - `formatDegree(d: Degree): string` — inverse exact de `parseDegree` sur `label`.
  - `baseStep(d: Degree): 1..7` — pour la couleur (bVII → 7, V/V → 5).
  - `isDiatonicQuality(step, quality, mode: 'major'|'minor'): boolean`

- [ ] **Step 1 : écrire les tests**

```ts
test('triades diatoniques', () => {
  expect(parseDegree('I')).toMatchObject({ step: 1, accidental: 0, quality: 'maj', bass: 1 });
  expect(parseDegree('vi')).toMatchObject({ step: 6, quality: 'min' });
  expect(parseDegree('vii°')).toMatchObject({ step: 7, quality: 'dim' });
});
test('septièmes, ø et ° distingués', () => {
  expect(parseDegree('viiø7').quality).toBe('ø7');
  expect(parseDegree('vii°7').quality).toBe('°7');
  expect(parseDegree('V7').quality).toBe('7');
  expect(parseDegree('IVmaj7').quality).toBe('maj7');
});
test('altérations, renversements, secondaires', () => {
  expect(parseDegree('bVII')).toMatchObject({ step: 7, accidental: -1, quality: 'maj' });
  expect(parseDegree('#iv°7')).toMatchObject({ step: 4, accidental: 1, quality: '°7' });
  expect(parseDegree('I/3').bass).toBe(3);
  expect(parseDegree('V7/V').secondaryOf).toMatchObject({ step: 5 });
  expect(parseDegree('V+').quality).toBe('aug');
});
test('format est l’inverse de parse', () => {
  for (const s of ['I', 'ii7', 'viiø7', 'bVII', 'V7/V', 'I/3', 'V+']) expect(formatDegree(parseDegree(s))).toBe(s);
});
test('syntaxe invalide', () => {
  expect(() => parseDegree('VIII')).toThrow(DegreeSyntaxError);
  expect(() => parseDegree('vii7')).toThrow(DegreeSyntaxError); // ambigu : ø7 ou °7 obligatoire
});
test('baseStep', () => {
  expect(baseStep(parseDegree('bVII'))).toBe(7);
  expect(baseStep(parseDegree('V7/V'))).toBe(5);
});
```

- [ ] **Step 2 : lancer, vérifier l'échec** — Run : `npx vitest run src/lib/theory/degree.test.ts` — Expected : FAIL, module introuvable.

- [ ] **Step 3 : implémenter** `degree.ts` avec une expression régulière `^(b|#)?([ivIV]+)(maj7|ø7|°7|m7|7|6|\+)?(?:/(\d))?(?:/(.+))?$`, la casse du chiffre romain donnant maj/min pour les triades, `vii` seul donnant `dim` ; `vii7` sans ø/° est rejeté.

- [ ] **Step 4 : vérifier** — Expected : tous les tests passent.

- [ ] **Step 5 : commit** — `git commit -m "feat(theory): grammaire des degrés"`

---

### Task 3 : Degré → accord (notes, nom, fonction)

**Files :**
- Create : `app/src/lib/theory/chord.ts`, `app/src/lib/theory/chord.test.ts`, `app/src/lib/theory/colors.ts`

**Interfaces :**
- Consumes : `Degree`, `parseDegree`, `baseStep` (tâche 2).
- Produces :
  - `type Mode = 'major' | 'minor'`
  - `const KEYS: string[]` (12, orthographe : C Db D Eb E F Gb G Ab A Bb B)
  - `chordPitchClasses(key: string, mode: Mode, d: Degree): string[]` — fondamentale en premier, simplifiées (`Note.simplify`, donc `B` et non `Cb`)
  - `chordName(key: string, mode: Mode, d: Degree): string` — ex. `('C','major','vi')` → `Am`, `('C','major','viiø7')` → `Bm7b5`, `('A','minor','V7')` → `E7`, `('C','major','I/3')` → `C/E`
  - `bassPitchClass(key, mode, d): string` — selon `d.bass`
  - `type Fonction = 'tonique' | 'sous-dominante' | 'dominante'`
  - `functionOf(d: Degree): Fonction` — par `baseStep` : 1, 3, 6 tonique ; 2, 4 sous-dominante ; 5, 7 dominante ; secondaire → dominante
  - `ROLE: Record<1|2|3|4|5|6|7, string>` — textes du prototype (`DEGREE_ROLE`)
  - `colors.ts` : `DEGREE_COLORS: Record<1..7, string>` et `colorOf(d: Degree): string`

- [ ] **Step 1 : tests**

```ts
test('triades et septièmes en majeur', () => {
  expect(chordPitchClasses('C', 'major', parseDegree('V7'))).toEqual(['G', 'B', 'D', 'F']);
  expect(chordName('C', 'major', parseDegree('viiø7'))).toBe('Bm7b5');
  expect(chordName('C', 'major', parseDegree('vii°7'))).toBe('Bdim7');
});
test('mineur harmonique pour V7, naturel pour bVII', () => {
  expect(chordName('A', 'minor', parseDegree('V7'))).toBe('E7');
  expect(chordName('A', 'minor', parseDegree('bVII'))).toBe('G');
  expect(chordName('A', 'minor', parseDegree('iiø7'))).toBe('Bm7b5');
});
test('enharmonies simplifiées', () => {
  expect(chordPitchClasses('Gb', 'major', parseDegree('IV'))).toEqual(['B', 'Eb', 'Gb']);
  expect(chordName('Gb', 'major', parseDegree('IV'))).toBe('B');
});
test('renversement et secondaire', () => {
  expect(bassPitchClass('C', 'major', parseDegree('I/3'))).toBe('E');
  expect(chordName('C', 'major', parseDegree('I/3'))).toBe('C/E');
  expect(chordPitchClasses('C', 'major', parseDegree('V7/V'))).toEqual(['D', 'F#', 'A', 'C']);
});
test('fonction', () => {
  expect(functionOf(parseDegree('vi'))).toBe('tonique');
  expect(functionOf(parseDegree('bVII'))).toBe('dominante');
  expect(functionOf(parseDegree('V7/V'))).toBe('dominante');
});
```

- [ ] **Step 2 : échec attendu** — Run le fichier — Expected : FAIL.

- [ ] **Step 3 : implémenter** : gamme majeure ou mineure naturelle via `Scale.get`, fondamentale = degré ± altération ; qualité → intervalles fixes (`maj` 1-3-5, `min` 1-b3-5, `dim`, `aug`, `7` 1-3-5-b7, `maj7`, `m7`, `ø7` 1-b3-b5-b7, `°7` 1-b3-b5-bb7, `6`) construits par `Note.transpose` puis `Note.simplify` ; nom via table de suffixes (`''`, `m`, `dim`, `aug`, `7`, `maj7`, `m7`, `m7b5`, `dim7`, `6`) + `/basse` si renversé. Les secondaires : fondamentale = quinte au-dessus de la cible.

- [ ] **Step 4 : vérifier** — Expected : PASS.

- [ ] **Step 5 : commit** — `git commit -m "feat(theory): degré → accord, nom, fonction, couleurs"`

---

### Task 4 : Voicings avec conduite de voix, RNG injectable

**Files :**
- Create : `app/src/lib/theory/rng.ts`, `app/src/lib/theory/voicing.ts`, `app/src/lib/theory/voicing.test.ts`

**Interfaces :**
- Consumes : `chordPitchClasses`, `bassPitchClass` (tâche 3).
- Produces :
  - `type Rng = () => number` ; `seededRng(seed: number): Rng` (mulberry32)
  - `interface Voicing { bass: string; upper: string[] }` (notes avec octave)
  - `voiceChords(key, mode, degrees: Degree[], rng: Rng, opts?: { bassRange?: [number, number]; upperLow?: number }): Voicing[]` — port de `voiceProgression` du prototype avec en plus : basse = `bassPitchClass` (renversements), voix supérieures sur 3 ou 4 sons, direction du premier mouvement tirée par `rng`.
  - `notesOf(v: Voicing): string[]` — `[bass, ...upper]`

- [ ] **Step 1 : tests**

```ts
const rng = seededRng(42);
test('basse dans la tessiture et mouvement proche', () => {
  const v = voiceChords('C', 'major', ['I','V','vi','IV'].map(parseDegree), rng);
  for (const x of v) { const m = Note.midi(x.bass)!; expect(m).toBeGreaterThanOrEqual(40); expect(m).toBeLessThanOrEqual(57); }
  for (let i = 1; i < v.length; i++) expect(Math.abs(Note.midi(v[i].bass)! - Note.midi(v[i-1].bass)!)).toBeLessThanOrEqual(7);
});
test('renversement : la basse est la tierce', () => {
  const v = voiceChords('C', 'major', [parseDegree('I/3')], rng);
  expect(Note.pitchClass(v[0].bass)).toBe('E');
});
test('voix supérieures au-dessus de la basse, mouvement minimal', () => {
  const v = voiceChords('A', 'major', ['I','V'].map(parseDegree), rng);
  expect(Note.midi(v[0].upper[0])!).toBeGreaterThan(Note.midi(v[0].bass)! + 4);
  const move = v[1].upper.reduce((s, n, k) => s + Math.abs(Note.midi(n)! - Note.midi(v[0].upper[k])!), 0);
  expect(move).toBeLessThanOrEqual(6);
});
test('déterministe avec la même graine', () => {
  const a = voiceChords('D', 'major', ['I','IV'].map(parseDegree), seededRng(7));
  const b = voiceChords('D', 'major', ['I','IV'].map(parseDegree), seededRng(7));
  expect(a).toEqual(b);
});
```

- [ ] **Step 2 : échec attendu.** — [ ] **Step 3 : implémenter.** — [ ] **Step 4 : PASS.** — [ ] **Step 5 : commit** `feat(theory): voicings avec conduite de voix`

---

### Task 5 : Moteur audio et instruments

**Files :**
- Create : `app/src/lib/audio/engine.ts`, `app/src/lib/audio/instruments.ts`, `app/src/lib/audio/README.md` (checklist navigateur)

**Interfaces :**
- Produces :
  - `type Timbre = 'piano' | 'guitare' | 'nappe'`
  - `loadInstrument(t: Timbre): Promise<void>` — piano : Sampler Salamander (sous-ensemble : A0 à C8 par tierces mineures, comme le prototype) ; guitare : Sampler `tonejs-instruments` guitar-acoustic (6 samples) ; nappe : `PolySynth` (`fatsawtooth`, attaque 0.3 s, filtre passe-bas). Échec → réessayable.
  - `unlock(): Promise<void>` — `audioSession.type = 'playback'` si disponible, puis `Tone.start()`.
  - `playSequence(chords: string[][], bpm: number, timbre: Timbre, onChord?: (i) => void, beatsPerChord = 4): Promise<void>` — fin calée sur `Tone.now()`, jeton de génération (port corrigé du prototype).
  - `playChord(notes: string[], timbre: Timbre, duration = '2n'): void` ; `playNote(note, timbre, duration = '1n')`
  - `stop(): void`
  - `isLoaded(t: Timbre): boolean`

- [ ] **Step 1 : porter `proto/src/lib/audio.ts`** dans `engine.ts` avec le timbre en paramètre et `instruments.ts` qui fabrique les trois sources.

- [ ] **Step 2 : page de test manuelle** `app/src/routes/dev-audio.svelte` (montée seulement si `location.hash === '#dev-audio'`) : trois boutons timbre, un bouton « cadence », un « accord », un « stop ».

- [ ] **Step 3 : vérifier dans le navigateur intégré** — Run : `npm run dev` ; ouvrir `/#dev-audio` ; Expected : les trois timbres jouent, « stop » coupe net, deux taps rapides ne superposent rien, aucune erreur console. Noter le résultat dans `README.md`.

- [ ] **Step 4 : commit** `feat(audio): moteur Tone.js à trois timbres`

---

### Task 6 : Contenu des paliers (YAML + schéma)

**Files :**
- Create : `app/src/content/paliers/A.yaml`, `B.yaml`, `C.yaml`, `D.yaml`, `app/src/lib/content/schema.ts`, `app/src/lib/content/paliers.ts`, `app/src/lib/content/paliers.test.ts`

**Interfaces :**
- Produces :
  - Schéma zod `PalierSchema` → `interface Palier { id: 'A'|'B'|'C'|'D'|…; titre: string; explication: string; modes: Mode[]; degres: string[]; sevenths: boolean; type: 'degre' | 'basse' | 'progression'; longueur: [number, number]; serie: { questions: number; rappels: number; seuil: number; seriesConsecutives: number; suiteReussites: number }; reecoutes: number; chant: boolean; timbres: Timbre[]; cadence: string[] }`
  - `loadPaliers(): Palier[]` (import YAML via le plugin, validé ; une erreur de schéma lance avec le nom du fichier et le chemin fautif)
  - `PALIER_ORDER: string[]`

Contenu, valeurs de la spec :

```yaml
# A.yaml
id: A
titre: Ancrage
explication: Une cadence installe la tonalité, puis un accord : est-ce le I, le IV, le V ou le vi ?
modes: [major]
degres: [I, IV, V, vi]
sevenths: false
type: degre
longueur: [1, 1]
serie: { questions: 6, rappels: 2, seuil: 0.85, seriesConsecutives: 2, suiteReussites: 6 }
reecoutes: 3
chant: false
timbres: [piano, guitare, nappe]
cadence: [I, IV, V, I]
```

B : `modes: [major, minor]`, `degres` majeur `[I, ii, iii, IV, V, vi, vii°]`, mineur `[i, ii°, bIII, iv, V, bVI, bVII]` (champ `degresMineur`), `sevenths: true` (deuxième moitié du palier : `Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7` / `im7, iiø7, bIIImaj7, iv7, V7, bVImaj7, bVII7`), `reecoutes: 2`.
C : `type: basse`, `degres: [I, IV, V, vi, ii]` avec renversements `/3`, `/5`, et `/7` quand `sevenths`, `chant: true`, `reecoutes: 2`.
D : `type: progression`, `longueur: [2, 2]`, `degres: [I, ii, IV, V, vi]`, `chant: true`, `reecoutes: 2`, `cadence: [I, V7, I]`.

- [ ] **Step 1 : tests**

```ts
test('les quatre paliers chargent et sont ordonnés', () => {
  const p = loadPaliers();
  expect(p.map((x) => x.id)).toEqual(['A', 'B', 'C', 'D']);
  expect(p[0].degres).toEqual(['I', 'IV', 'V', 'vi']);
});
test('tous les degrés sont valides pour la grammaire', () => {
  for (const p of loadPaliers()) for (const d of [...p.degres, ...(p.degresMineur ?? [])]) expect(() => parseDegree(d)).not.toThrow();
});
test('un fichier invalide est refusé avec son nom', () => {
  expect(() => PalierSchema.parse({ id: 'Z', serie: { questions: 0 } })).toThrow();
});
```

- [ ] **Step 2 : échec.** — [ ] **Step 3 : écrire les YAML et le schéma.** — [ ] **Step 4 : PASS.** — [ ] **Step 5 : commit** `feat(content): paliers A à D en YAML validé`

---

### Task 7 : Générateur de questions

**Files :**
- Create : `app/src/lib/engine/question.ts`, `app/src/lib/engine/generator.ts`, `app/src/lib/engine/generator.test.ts`

**Interfaces :**
- Consumes : `Palier` (tâche 6), `voiceChords`, `Rng` (tâche 4), théorie (tâches 2-3).
- Produces :
  - `interface Question { id: string; palier: string; type: Palier['type']; key: string; mode: Mode; timbre: Timbre; bpm: number; cadence: string[][]; stimulus: Voicing[]; degrees: Degree[]; expected: Answer; itemKey: string }`
  - `type Answer = { kind: 'degre'; degree: string } | { kind: 'basse'; bass: 1|3|5|7 } | { kind: 'progression'; degrees: string[] }`
  - `generate(palier: Palier, rng: Rng, opts?: { itemKey?: string }): Question` — `itemKey` force l'item (pour les rappels Leitner) ; sinon tirage uniforme parmi les items du palier.
  - `itemsOf(palier: Palier): string[]` — clés d'items : A/B → `"<mode>:<degré>"`, C → `"<degré>/<basse>"`, D → `"<deg1>-<deg2>"` pour toutes les paires autorisées par les règles fonctionnelles (spec 5.7.2 : tonique → tout ; sous-dominante → dominante ou tonique ; dominante → tonique ou vi).
  - `grade(q: Question, a: Answer): { correct: boolean; perChord?: boolean[] }` — équivalences de la spec 5.5 (degré seul aux paliers A-D).

- [ ] **Step 1 : tests**

```ts
const A = loadPaliers()[0];
test('A : degré attendu dans la liste, tonalité et timbre variés', () => {
  const keys = new Set(), timbres = new Set();
  for (let i = 0; i < 60; i++) { const q = generate(A, seededRng(i)); expect(A.degres).toContain(q.expected.kind === 'degre' && q.expected.degree); keys.add(q.key); timbres.add(q.timbre); }
  expect(keys.size).toBeGreaterThan(6); expect(timbres.size).toBe(3);
});
test('C : basse = septième possible avec sevenths', () => {
  const C = loadPaliers()[2];
  const items = itemsOf(C);
  expect(items).toContain('V7/7');
  const q = generate(C, seededRng(1), { itemKey: 'V7/7' });
  expect(q.expected).toEqual({ kind: 'basse', bass: 7 });
  expect(Note.pitchClass(q.stimulus[0].bass)).toBe(bassPitchClass(q.key, q.mode, parseDegree('V7/7')));
});
test('D : paires conformes aux règles fonctionnelles', () => {
  const items = itemsOf(loadPaliers()[3]);
  expect(items).toContain('I-V'); expect(items).toContain('V-vi'); expect(items).toContain('ii-V');
  expect(items).not.toContain('V-IV'); expect(items).not.toContain('V-ii');
});
test('grade', () => {
  const q = generate(A, seededRng(3), { itemKey: 'major:IV' });
  expect(grade(q, { kind: 'degre', degree: 'IV' }).correct).toBe(true);
  expect(grade(q, { kind: 'degre', degree: 'V' }).correct).toBe(false);
});
```

- [ ] **Step 2 : échec.** — [ ] **Step 3 : implémenter** (bpm tiré dans [84, 112] ; cadence voicée avec `voiceChords` puis stimulus voicé en continuité : la basse du stimulus part de la basse finale de la cadence). — [ ] **Step 4 : PASS.** — [ ] **Step 5 : commit** `feat(engine): générateur de questions A-D`

---

### Task 8 : Leitner, séries, déblocage

**Files :**
- Create : `app/src/lib/engine/leitner.ts`, `app/src/lib/engine/session.ts`, `app/src/lib/engine/session.test.ts`

**Interfaces :**
- Consumes : `Palier`, `itemsOf`, `generate`, `grade` (tâches 6-7).
- Produces :
  - `interface Box { item: string; palier: string; box: 0|1|2|3|4; due: number }` ; `const INTERVALS_MS = [0, 1 j, 3 j, 7 j, 21 j]`
  - `promote(b: Box, now): Box` ; `demote(b: Box, now): Box` (retour en boîte 0)
  - `interface Progress { paliers: Record<string, { unlocked: boolean; validated: boolean; consecutiveSeries: number; streak: number }>; boxes: Box[]; series?: SeriesState }`
  - `interface SeriesState { palier: string; questions: Question[]; index: number; results: boolean[] }`
  - `startSeries(progress, palier, rng, now): SeriesState` — `serie.questions` questions du palier (items les moins avancés d'abord, puis aléatoire) + `serie.rappels` rappels pris dans les boîtes dues des paliers validés.
  - `answer(progress, series, a: Answer, now): { correct: boolean; done: boolean; progress; series }` — met à jour boîtes, `streak`, et à la dernière question `consecutiveSeries` et `validated` selon la spec 5.7.1 ; débloque le palier suivant.
  - `scoreOf(series): { correct: number; total: number }` — sur les 6 questions du palier seulement.

- [ ] **Step 1 : tests**

```ts
test('série = 6 + 2 rappels, seuls les 6 comptent', () => {
  const s = startSeries(fresh(), A, seededRng(1), 0);
  expect(s.questions.length).toBe(8);
  expect(s.questions.filter((q) => q.palier === 'A').length).toBe(8); // aucun palier validé : rappels pris dans A
});
test('deux séries consécutives à 85 % débloquent B', () => {
  let p = fresh(); for (let k = 0; k < 2; k++) { let s = startSeries(p, A, seededRng(k), 0); for (;;) { const r = answer(p, s, s.questions[s.index].expected, 0); p = r.progress; s = r.series; if (r.done) break; } }
  expect(p.paliers.A.validated).toBe(true); expect(p.paliers.B.unlocked).toBe(true);
});
test('6 réussites d’affilée valident aussi', () => { /* répondre juste 6 fois dans une série, vérifier validated avant la fin */ });
test('une série ratée remet le compteur à zéro', () => { /* 1 série parfaite, 1 série à 50 %, consecutiveSeries === 0 */ });
test('une erreur rétrograde l’item en boîte 0', () => { /* promote deux fois, demote, box === 0 */ });
test('série interrompue : reprise cohérente', () => {
  let p = fresh(); let s = startSeries(p, A, seededRng(5), 0);
  ({ progress: p, series: s } = answer(p, s, s.questions[0].expected, 0));
  const saved = JSON.parse(JSON.stringify({ p, s }));
  expect(saved.s.index).toBe(1); expect(saved.s.results).toEqual([true]);
});
```

- [ ] **Step 2 : échec.** — [ ] **Step 3 : implémenter.** — [ ] **Step 4 : PASS.** — [ ] **Step 5 : commit** `feat(engine): Leitner, séries, déblocage`

---

### Task 9 : Persistance IndexedDB

**Files :**
- Create : `app/src/lib/engine/store.ts`, `app/src/lib/engine/store.test.ts`

**Interfaces :**
- Produces : `loadProgress(): Promise<Progress>` (état initial si vide : A débloqué), `saveProgress(p): Promise<void>`, `exportJson(): Promise<string>`, `importJson(s: string): Promise<void>` (validé par zod, remplace tout), `resetAll(): Promise<void>`.

- [ ] **Step 1 : tests** (fake-indexeddb) : sauvegarde puis rechargement égal ; export puis import restitue ; import invalide lance et ne modifie rien ; `loadProgress` initial a `paliers.A.unlocked === true` et `B.unlocked === false`.
- [ ] **Step 2 : échec.** — [ ] **Step 3 : implémenter avec `idb`, base `oreille`, store `progress`, clé `main`.** — [ ] **Step 4 : PASS.** — [ ] **Step 5 : commit** `feat(engine): persistance IndexedDB et export`

---

### Task 10 : Interface — accueil, exercice, révélation

**Files :**
- Create : `app/src/lib/ui/Home.svelte`, `Exercise.svelte`, `Reveal.svelte`, `Wheel.svelte`, `Timeline.svelte`, `BassLine.svelte`, `Keyboard.svelte`, `Pile.svelte`, `DegreePad.svelte`, `app/src/lib/ui/router.ts`
- Modify : `app/src/App.svelte`, `app/src/app.css`

**Interfaces :**
- Consumes : tout ce qui précède.
- Comportement :
  - **Accueil** : liste des paliers A à D avec titre, explication d'une phrase, état (verrouillé / en cours / validé), score de la dernière série ; bouton « Commencer » ; lien « Exporter / Importer / Réinitialiser » ; « Casque conseillé ».
  - **Exercice** : les trois étapes du prototype (1. Ancrage avec cadence affichée et animée, 2. Écoute avec « ? », 3. Réponds), compteur « question 3 / 8 », bouton « Passer » pendant la lecture, réécoutes limitées par `palier.reecoutes`. Pad de réponse selon `type` : `degre` → boutons des degrés du palier (colorés) ; `basse` → quatre boutons « fondamentale / tierce / quinte / septième » ; `progression` → saisie séquentielle par changement d'accord avec « Effacer ». Si `palier.chant` : étape « Chante la basse » avec « Rejouer la basse seule » et « J'ai chanté » avant d'activer le pad.
  - **Révélation** : résultat, puis les vues du prototype dans cet ordre : annonce « degré · nom · fonction · rôle », Pile (type `degre`/`basse`), Roue + légende et Timeline (type `progression`), Ligne de basse, Clavier ; tout est tapable et joue (spec 6.6) ; boutons « Réécouter » et « Suivante » collés en bas ; en fin de série, écran de bilan (score, palier validé ou non, « Encore une série » / « Accueil »).
  - Les vues sont réécrites d'après le prototype, typées sur `Degree` (tâche 2) et `Voicing` (tâche 4) ; `Pile.svelte` est nouvelle (spec 6.2 : briques empilées, basse surlignée, guide-tones pointés).

- [ ] **Step 1 : router minimal** (`#/`, `#/palier/A`, `#/serie`) dans `router.ts` avec un `$state` ; **Step 2 : Home** ; **Step 3 : Exercise + DegreePad + étape chant** ; **Step 4 : Reveal + vues** ; chaque step se termine par une vérification dans le navigateur intégré en 390 × 800.

- [ ] **Step 5 : parcours complet vérifié** — Expected : une série entière du palier A, bilan, série du palier C avec l'étape chant, série du palier D avec saisie de deux accords ; aucune erreur console ; chaque élément révélé joue au tap ; « Passer » disponible pendant la lecture.

- [ ] **Step 6 : commit** `feat(ui): accueil, exercice, révélation pour A-D`

---

### Task 11 : PWA, hors ligne, déploiement

**Files :**
- Modify : `app/vite.config.ts` (vite-plugin-pwa : manifest nom « Oreille », icônes, `display: standalone`, `theme_color: #121216` ; Workbox `runtimeCaching` pour `tonejs.github.io` et `nbrosowsky.github.io` en `CacheFirst`), `app/public/icons/*`, `app/index.html` (meta viewport, apple-touch-icon)
- Create : `app/src/lib/ui/Offline.svelte` (bannière « connecte-toi une fois pour charger les sons » si `!navigator.onLine && !isLoaded(timbre)`)

- [ ] **Step 1 : configurer** ; **Step 2 : `npm run build && npm run preview`** ; vérifier dans le navigateur : manifest valide (onglet Application), service worker actif, puis couper le réseau (DevTools) et recharger : l'app s'ouvre et le piano déjà chargé joue ; **Step 3 : commit** `feat(app): PWA installable et hors ligne`.
- [ ] **Step 4 : déploiement** — au choix de l'utilisateur : `vercel` (le CLI n'est pas installé) ou GitHub Pages. Documenter les deux commandes dans `app/README.md` ; ne pas déployer sans son accord.

---

## Sous-projets suivants (cadrés, à détailler après le sous-projet 1)

**Sous-projet 2 — Progressions et tensions (paliers E, F)** : générateur à règles fonctionnelles de longueur 3 à 6 avec poids pop, familles nommées à la révélation (« c'est un I-V-vi-IV »), palier F (dim et aug en fonction, dominantes secondaires, emprunts, N6) avec pad degré + qualité et table d'équivalences (spec 5.5), option « basse seule d'abord » hors séries de déblocage (5.4), mode piano (5.3).

**Sous-projet 3 — Répertoire et test de transfert (paliers G, H)** : schéma `content/songs/*.yaml` (spec 7.2) avec validateur, lecteur de mélodie pour les comptines, grille jouée avec textures par timbre (arpèges piano, battement guitare), saisie séquentielle par changement d'accord sur une grille entière, encodage du répertoire de la spec 9 (G puis H), **relevé réel bimensuel** avec lien externe et tableau de bord de la courbe de transfert (5.7.3).

**Sous-projet 4 — Jazz et bilan (palier I, stats)** : ii-V-I majeur et mineur, turnarounds, blues, rhythm changes ; voicings jazz (rootless, drop 2) ; écran de statistiques (par palier, par item, par tonalité, par timbre) ; export complet.

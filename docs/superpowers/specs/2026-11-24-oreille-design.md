# Oreille — cahier de conception

Date : 2026-11-24
Statut : approuvé le 2026-11-24

## 1. Intention

Une web app mobile d'entraînement de l'oreille harmonique dont l'objectif final est unique : **reconnaître à l'écoute les accords et les progressions de morceaux simples** (comptines, classique populaire, pop/rock grand public, puis standards de jazz).

L'utilisateur est pianiste (fin de premier cycle de conservatoire), autodidacte solide en harmonie jazz. Il connaît les degrés, les chiffres romains, les noms d'accords et les ii-V-I. Son problème n'est pas théorique : il « calcule » les progressions au lieu de les entendre. L'app doit donc **brancher l'oreille sur une théorie déjà en place**, en imposant l'ordre entendre → nommer → vérifier.

## 2. Objectifs, non-objectifs, anti-objectifs

### Objectifs
- Entendre la **fonction** d'un accord (degré relatif à la tonique) dans toutes les tonalités, timbres et voicings.
- Entendre la **qualité** d'un accord (majeur, mineur, diminué, augmenté, septièmes) en situation fonctionnelle.
- Entendre le **renversement** (quelle note est à la basse).
- Reconnaître les **progressions** courantes de la pop, du classique populaire et du jazz.
- Relever la **grille complète** d'un morceau connu joué par le synthé.
- Utilisable d'une main, au casque, en sessions de 3 à 5 minutes, hors ligne.
- Répertoire **extensible** par l'utilisateur sans toucher au code de l'app (fichiers de données).

### Non-objectifs (pour cette version)
- Reconnaissance de hauteur absolue, dictée mélodique, rythme.
- Analyse audio de vrais enregistrements (pas de micro, pas d'extraction d'accords).
- Compte utilisateur, synchronisation multi-appareils, partage social.
- Lecture de partition, notation classique.

### Anti-objectifs (ce qui ferait échouer le projet même s'il « marche »)
- Une app où l'on réussit en calculant : réécoute illimitée, temps infini, indices théoriques avant la réponse.
- Une app qui n'entraîne que le son du piano en Do majeur.
- Une visualisation qui distrait de l'écoute au lieu de la structurer.
- Un cours de théorie de plus.

## 3. Contraintes

- Cible : téléphone (iOS Safari et Android Chrome), aussi utilisable sur ordinateur.
- Audio déclenché uniquement après un geste utilisateur (contrainte iOS), latence faible, pas de dépendance réseau une fois installée.
- Droits : les comptines et le classique populaire sont joués avec mélodie (domaine public). La pop est jouée **en grille d'accords seule**, sans mélodie ni paroles ; titre et artiste apparaissent comme métadonnées à la révélation, avec un lien externe (YouTube, Chordify) pour la vérification sur l'enregistrement.
- Pas de backend, pas de coût récurrent.

## 4. Approches envisagées

| Approche | Résumé | Compromis |
|---|---|---|
| **1. PWA statique, tout dans le téléphone** (retenue) | Vite + Svelte, Tone.js, Tonal.js, IndexedDB, déploiement statique | Simple, hors ligne, gratuit. Progression sur un seul appareil, export/import JSON pour sauvegarde |
| 2. Next.js + compte + base de données | Même front, synchronisation et ouverture à d'autres | Complexité et coûts dès le premier jour pour un besoin absent ; hors-ligne plus délicat |
| 3. Prototype jetable seul | Une page, un palier, zéro persistance | Valide vite l'audio mobile et la visualisation, mais ne constitue pas l'app |

**Décision : approche 1, précédée d'un prototype façon 3.** Le risque principal est pédagogique (la visualisation aide-t-elle ou parasite-t-elle ?), pas technique ; une soirée de prototype règle la question avant d'investir dans neuf paliers. L'architecture statique garde le hors-ligne et la simplicité ; un backend reste greffable plus tard, la couche de données étant isolée.

## 5. Pédagogie

### 5.1 Principes
1. **Écoute fonctionnelle** : chaque exercice commence par une cadence d'ancrage (I-IV-V-I ou I-V7-I) dans la tonalité du jour ; tout est ensuite entendu relativement à cette tonique. Filiation : Functional Ear Trainer (Benbassat), solfège relatif (Kodály), audiation (Gordon).
2. **Entendre → nommer → vérifier.** Temps de réponse limité et réécoutes comptées aux paliers avancés ; aucun indice théorique avant la réponse ; révélation complète après (chiffre romain, nom d'accord, pile, roue).
3. **Écoute à deux voix** : la basse porte la fonction (I-V-vi-IV s'entend 1-5-6-4) ; la voix supérieure ou les guide-tones (tierces et septièmes) portent la couleur. Des exercices isolent chacune de ces voix.
4. **Variation systématique** : à chaque question, tirage aléatoire de la tonalité (12), du timbre (piano, guitare, nappe), du voicing (fermé, ouvert, avec ou sans doublure), du registre et du tempo. L'oreille doit généraliser, pas mémoriser des hauteurs.
5. **Tensions en fonction** : diminué et augmenté ne sont jamais présentés isolés ; ils apparaissent comme vii°7, #i°7 de passage, V+, I+ vers IV, etc. Même logique pour les dominantes secondaires et les emprunts.
6. **Répétition espacée** : chaque item (un accord-fonction, une progression, un morceau) a une boîte de Leitner ; les items ratés reviennent plus souvent, y compris dans les paliers déjà validés.

### 5.2 Paliers

Déblocage d'un palier à 85 % de réussite sur une série de 20 questions, deux fois. Les paliers A et B sont des échauffements rapides pour cet utilisateur mais restent dans l'app.

| Palier | Contenu | Format de réponse |
|---|---|---|
| A | Cadence, puis un accord à situer parmi I, IV, V, vi | Boutons de degrés |
| B | Les sept degrés diatoniques en triades, puis en septièmes (Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7). Mode mineur introduit (i, iiø, V7, iv, bVI, bVII) | Boutons de degrés |
| C | Renversements : pour un accord connu, quelle note est à la basse (fondamentale, tierce, quinte, septième) | Boutons « basse = … » + étape « chante la basse » (voir 5.4) |
| D | Progressions de 2 accords : I-V, I-IV, I-vi, IV-V, V-vi, ii-V, IV-I, V-I | Choix de la paire ou deux boutons successifs |
| E | Progressions de 4 accords : I-V-vi-IV et rotations (vi-IV-I-V, IV-I-V-vi), I-vi-IV-V, I-IV-V-I, I-iii-IV-V, ii-V-I-vi, I-vi-ii-V, en majeur et en mineur | Saisie séquentielle des 4 degrés |
| F | Tensions : vii°7 (diminué complet, emprunté au mineur), #i°7 et #iv°7 de passage, V+, I+→IV, V/V, V/vi, V/ii, bVII, iv, bVI, N6 | Saisie séquentielle, boutons degré puis qualité (voir 5.5) |
| G | Comptines et classique avec mélodie : trouver la grille entière | Saisie séquentielle, puis révélation |
| H | Pop grand public en grille seule, tempo réel, voicings variés : trouver la grille | Saisie séquentielle ou mode piano |
| I | Jazz : ii-V-I majeur et mineur, turnarounds, I-vi-ii-V, cycles de quartes, blues à 12 mesures, rhythm changes (A) | Saisie séquentielle ou mode piano |

### 5.3 Deux modes d'usage
- **Mode poche** : dans les transports, gros boutons, séries courtes, réponses par choix.
- **Mode piano** : le téléphone joue, l'utilisateur rejoue sur **son vrai piano**, puis appuie sur « révéler » et s'auto-évalue (juste / partiel / faux). L'app ne capture rien (ni micro, ni MIDI, ni clavier à l'écran) ; c'est un écran de révélation avec trois boutons. Pas de choix multiple. **Obligatoire pour valider G, H et I** : c'est la compétence visée (relever une grille). Seul « juste » compte comme réussite pour le seuil.

### 5.4 Écoute à deux voix dans les exercices
L'isolation des voix (principe 5.1.3) est une **option de rendu** de chaque question, pas un palier séparé : le stimulus peut être joué « accord complet », « basse seule » ou « guide-tones seuls ». Règles :
- Après la réponse, deux boutons « réécouter la basse » et « réécouter les guide-tones » sont toujours disponibles (révélation).
- Au palier C, une étape optionnelle précède la réponse : « chante la basse », puis un bouton rejoue la basse seule pour que l'utilisateur se vérifie à l'oreille (auto-évaluation implicite, non notée).
- Aux paliers D à I, un réglage « aide : basse seule d'abord » fait jouer la basse seule avant l'accord complet. Cette aide est **désactivée pour les séries qui comptent pour le déblocage**.

### 5.5 Précision attendue et équivalences
- Paliers A à E : la réponse est le **degré** ; la qualité est implicite (diatonique).
- Paliers F, H et I : la réponse est **degré + qualité**, saisie en deux temps (bouton de degré, puis bouton de qualité : maj, min, 7, maj7, m7, ø7, °7, +, 6). Une table d'équivalences accepte les notations synonymes (V/V ≡ II7 ; bVII ≡ VII en mineur ; I6 ≡ Imaj7 sauf au palier I où le blues exige I7 ≠ Imaj7).
- Le **renversement** n'est exigé qu'au palier C. Ailleurs, une basse étrangère marquante (Canon de Pachelbel, Hotel California) est affichée à la révélation (« I/3 ») mais pas demandée.
- La grammaire des degrés distingue ø (demi-diminué) et ° (diminué) et le validateur la vérifie au build.

### 5.6 Composition des séries et déblocage
- Une série compte 20 questions : **16 du palier en cours, 4 rappels** tirés dans les boîtes de Leitner des paliers validés (items les plus faibles d'abord).
- Seules les 16 questions du palier en cours comptent pour le seuil de 85 %. Les rappels mettent à jour leurs propres boîtes.
- Le déblocage exige **deux séries consécutives** au-dessus du seuil ; une série ratée remet le compteur à zéro.
- Les valeurs 20 / 16 / 85 % / 2 sont des paramètres de `content/paliers`.

## 6. Visualisation

Deux vues, toujours affichées **après** la réponse (ou pendant l'écoute aux paliers A et B uniquement, en option « guidé »).

### 6.1 Couleurs et symboles
- **Fonction → couleur**, convention Hooktheory : I rouge, ii orange, iii jaune, IV vert, V bleu, vi violet, vii indigo. Les degrés altérés (bVII, V/V…) prennent la couleur de leur degré de base avec un motif hachuré. Cette convention donne un pont direct vers TheoryTab, dont l'utilisateur pourra ensuite se servir.
- **Chiffres romains toujours affichés**, nom d'accord à la révélation (« vi · Am7 »). La couleur est un fond, jamais le seul porteur d'information.
- **Qualité → forme et luminosité** : majeur plein et lumineux ; mineur même teinte, plus sombre et plus étroit ; diminué contracté à bords anguleux ; augmenté étiré, bords flous ; septième = une brique supplémentaire.

### 6.2 La pile (un accord)
Briques empilées de bas en haut, dans l'ordre du voicing réel. La basse est en bas et surlignée ; les guide-tones (tierce, septième) portent un point. Un renversement se lit comme la même pile avec une autre brique en bas. Animation : la pile se construit note par note au moment où l'accord sonne.

### 6.3 La roue de gravité (une progression)
Tonique au centre, degrés disposés autour (ordre par quintes : IV à gauche, V à droite, vi, ii, iii, vii plus loin). La progression est tracée comme un fil qui s'éloigne du centre et y revient ; le V est dessiné tendu vers le I (élastique). Les dominantes secondaires apparaissent comme des satellites temporaires autour de leur cible. Sous la roue, une timeline de blocs colorés, un bloc par mesure, qui défile avec la lecture : c'est l'image qu'on veut que l'utilisateur « voie » en écoutant une chanson.

## 7. Architecture technique

### 7.1 Pile
- **Svelte 5 + Vite**, TypeScript, PWA via `vite-plugin-pwa` (manifest, service worker, cache des samples).
- **Tone.js** : `Sampler` piano (Salamander, sous-ensemble de samples pour limiter le poids), guitare et nappe synthétique ; `Transport` pour les progressions au tempo.
- **Tonal.js** : construction d'accords à partir des degrés, transposition, renversements, noms d'accords.
- **IndexedDB** (via `idb`) pour la progression et les boîtes de Leitner ; export/import JSON.
- SVG pour la pile et la roue, animé via les transitions Svelte.
- Déploiement statique (Vercel ou GitHub Pages), aucun backend.

### 7.2 Modèle de données (fichiers, pas base)
Tout le contenu pédagogique est en **YAML dans `src/content/`**, pour que l'utilisateur puisse l'enrichir sans toucher au code :

```yaml
# content/songs/let-it-be.yaml
id: let-it-be
title: Let It Be
artist: The Beatles
lang: en
palier: H
mode: major
key: C                # tonalité d'origine, affichée à la révélation
meter: 4/4            # défaut 4/4 ; 3/4, 6/8 acceptés
tempo: 72
melody: null          # pop : grille seule
reference: https://…  # lien de vérification
sections:
  - name: verse
    bars:             # une entrée = une mesure ; une liste = plusieurs accords dans la mesure, durées égales
      - [I, V]
      - [vi, IV]
      - [I, V]
      - [IV, I]
```

```yaml
# content/songs/frere-jacques.yaml
id: frere-jacques
title: Frère Jacques
lang: fr
palier: G
mode: major
key: C
meter: 4/4
tempo: 100
melody: "C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4 | E4 F4 G4"   # notation simple en Do, transposée à la volée
sections:
  - name: all
    bars: [I, I, I, I, I, V, I, V, I]
```

Règles du modèle de grille :
- `bars` est une liste de **mesures**. Une mesure est soit un degré, soit une liste de degrés qui se partagent la mesure à durées égales (`[ii7, V7]` = deux blanches en 4/4). Des durées inégales s'écrivent avec un suffixe de fraction (`I:3 V:1` pour trois temps puis un temps) ; le validateur vérifie que la somme remplit la mesure.
- La **saisie séquentielle** demande une réponse **par changement d'accord**, pas par mesure : des mesures répétées (`I, I, I, I`) comptent pour une seule saisie, et la timeline montre la durée tenue. L'utilisateur voit le nombre de changements attendus.
- La timeline (6.3) affiche un bloc **par mesure**, subdivisé si la mesure contient plusieurs accords.
- La mélodie des comptines s'écrit par mesure, séparées par `|`, alignée sur `bars`.
- **Tonalité de lecture** : tirée au sort (principe 5.1.4) pour tous les paliers, morceaux inclus ; la révélation indique « joué en Mi, original en Do ». Un réglage « tonalité d'origine » existe pour le travail de vérification sur l'enregistrement, mais les séries jouées avec ce réglage ne comptent pas pour le déblocage. Le tempo reste celui du fichier, avec une variation de ±15 %.

Les progressions des paliers D-F et les paramètres de chaque palier (degrés autorisés, nombre de réécoutes, temps de réponse, seuil) sont décrits dans `content/paliers/*.yaml`. Un script de validation vérifie la syntaxe des degrés au build.

### 7.3 Moteur d'exercice
- `Question` = (palier, item, tonalité, timbre, voicing, registre, tempo, voix rendues) tirée au sort selon les boîtes de Leitner et les règles de 5.6.
- `render(Question)` → événements Tone.js (cadence d'ancrage puis stimulus).
- Réponse → `grade()` → mise à jour de la boîte → révélation (pile, roue, nom).
- Le mode piano remplace `grade()` par une auto-évaluation.

### 7.4 Prototype jetable (étape 0)
Une seule page, palier E uniquement (4 accords, majeur, piano seul), roue de gravité et timeline, aucune persistance. Buts : vérifier le déblocage audio iOS, la latence, et surtout tester si la roue aide l'écoute. Le code est jeté ; les conclusions sont reportées dans ce document avant la construction.

### 7.5 Conclusions du prototype

**Partie technique (navigateur intégré, viewport 390 × 800, 2026-11-24)** :
- Cycle complet vérifié : déblocage audio au tap, chargement du piano Salamander, cadence, progression, saisie, effacement, révélation, correction exacte (IV-I-V-vi en Si majeur, noms E / B / F# / G#m), roue et timeline synchronisées à la réécoute.
- Aucune erreur console. L'écran tient en 390 px sans défilement.
- **Durée d'une question trop longue** : cadence 4 mesures à 90 bpm (~11 s) + 1 s + progression 4 mesures à 70-100 bpm (~10-14 s), soit ~25 s avant de pouvoir répondre. Pour l'app : cadence raccourcie (I-V7-I sur 2 mesures, ou accords d'une blanche), tempo de progression ≥ 90 bpm, et option « accords tenus une blanche » aux premiers paliers.
- tonal rend le degré vii en mineur via `Progression.fromRomanNumerals` : l'app construit les triades par empilement de degrés de la gamme (ou utilise `RomanNumeral` + qualité explicite).
- Les tonalités en bémols produisent des noms comme `Cb3` (IV de Gb) : Tone.js les accepte, mais l'affichage devra simplifier les enharmonies (`Note.simplify`).
- `Tone.getDraw()` (requestAnimationFrame) **jette silencieusement** les événements en retard de plus de 250 ms : jamais pour une promesse de fin de séquence, seulement pour l'animation. Corrigé dans le prototype (fin de séquence calée sur l'horloge audio + jeton de génération pour ignorer les callbacks d'une séquence annulée) ; à reprendre tel quel dans l'app.
- Autres points iOS relevés en revue et corrigés dans le prototype : `navigator.audioSession.type = 'playback'` pour passer outre le commutateur silencieux ; `unlock()` aussi avant chaque réécoute (contexte suspendu après verrouillage) ; un échec de chargement des samples doit permettre de réessayer ; toujours un bouton de secours pendant la lecture.
- Mise en page : en 360 × 640, masquer les boutons de degrés à la révélation et limiter la roue à 240 px pour que « Nouvelle question » reste visible sans défilement.

**Partie pédagogique (essai au casque par l'utilisateur, 20 questions)** : _à compléter_ — score, utilité de la roue à la révélation (aide / neutre / distrait), longueur de la cadence, suffisance de 2 réécoutes.

**Essai sur téléphone (iOS Safari, Android Chrome)** : _à compléter_ — premier tap audible, latence, temps de chargement des samples en 4G et wifi, double tap sur « Nouvelle question », taille des boutons à une main.

## 8. Décisions prises (et par qui)

| Décision | Choix | Origine |
|---|---|---|
| Objectif central | Reconnaître des progressions de morceaux simples | Utilisateur |
| Vocabulaire affiché | Chiffres romains + noms d'accords | Utilisateur |
| Couleurs | Oui, convention Hooktheory, en fond | Proposition acceptée |
| Répertoire | Mix francophone / anglophone, grands standards pop, rock, classique, puis jazz ; extensible par fichiers | Utilisateur |
| Approche | PWA statique précédée d'un prototype | Utilisateur |
| Pile technique | Svelte + Vite + Tone.js + Tonal.js + IndexedDB | Mon choix (léger, bon pour l'animation, pas de backend) |
| Pop sans mélodie, comptines avec | Contrainte de droits | Mon choix |
| Mode piano obligatoire pour G-H-I | Compétence visée | Ma proposition |
| Seuil de palier 85 % × 2 séries consécutives de 20 (16 + 4 rappels) | Valeur de départ, réglable dans `content/paliers` | Mon choix |
| Grille = liste de mesures, plusieurs accords par mesure possibles, champ `meter` | Nécessaire pour ii-V en une mesure, 3/4, rhythm changes | Mon choix |
| Saisie par changement d'accord, pas par mesure | Évite de saisir `I I I I` | Mon choix |
| Réponse = degré seul (A-E), degré + qualité (F, H, I) ; renversement seulement en C | Garde la saisie à une main | Mon choix |
| Mode piano sans capture (ni micro, ni MIDI, ni clavier écran) | Simplicité, iOS sans Web MIDI | Mon choix |
| Isolation basse / guide-tones = option de rendu, pas un palier | Présente partout, jamais exigée | Mon choix |
| Morceaux joués en tonalité aléatoire, tonalité d'origine affichée à la révélation | Principe de variation ; option « tonalité d'origine » hors déblocage | Mon choix |

## 9. Répertoire de départ (à encoder)

- **G comptines** : Frère Jacques, Au clair de la lune, Ah vous dirai-je maman, Sur le pont d'Avignon, À la claire fontaine, Twinkle Twinkle, Happy Birthday, Row Row Row Your Boat, Amazing Grace, Jingle Bells.
- **G classique** : Canon de Pachelbel, Ode à la joie, Menuet en Sol (Petzold), Air sur la corde de Sol, Für Elise (A), Greensleeves.
- **H pop 4 accords** : Let It Be, No Woman No Cry, Someone Like You, Zombie, With or Without You, Don't Stop Believin', Je l'aime à mourir, Mistral gagnant, Dernière danse, Papaoutai, Formidable.
- **H pop variée** : Stand by Me, Every Breath You Take, Knockin' on Heaven's Door, Hallelujah, Wonderwall, La Bohème, Ne me quitte pas, Hotel California, Creep.
- **I jazz** : Autumn Leaves / Les Feuilles mortes, Fly Me to the Moon, Blue Bossa, All of Me, Blue Monk, I Got Rhythm (A).

Les grilles pop sont encodées d'après l'analyse en degrés communément admise (vérifiable sur TheoryTab) ; en cas de divergence entre versions, on retient la plus simple.

## 10. Laissé au constructeur
- Choix exact des samples et de leur compression ; nombre de notes du sampler.
- Détail des voicings générés par timbre (le piano en voicing à deux mains, la guitare en accords ouverts).
- Algorithme de Leitner précis (nombre de boîtes, intervalles).
- Charte visuelle hors couleurs de degrés (typographie, fond, mode sombre).
- Format exact de la notation mélodique des comptines, pourvu qu'il reste éditable à la main.
- Structure de l'écran d'accueil et des statistiques.

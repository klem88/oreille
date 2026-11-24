# Moteur audio (Tone.js)

- `instruments.ts` : trois timbres (`piano` Salamander, `guitare` tonejs-instruments guitar-acoustic : D2 A2 D3 A3 D4 A4, `nappe` PolySynth fatsawtooth + passe-bas, sans réseau). Chargement idempotent, échec réessayable.
- `engine.ts` : `unlock`, `playSequence(chords, bpm, timbre, onChord?, beatsPerChord = 4)`, `playChord`, `playNote`, `stop`.
- `stop()` et toute nouvelle `playSequence` RÉSOLVENT la promesse de la séquence annulée : l'appelant doit ignorer la résolution s'il a lancé autre chose entre-temps (voir `runId` dans `routes/dev-audio.svelte`).

## Checklist navigateur (`/#dev-audio`)

- [ ] Les trois timbres se chargent (état « prêt »), erreur réseau -> « Réessayer ».
- [ ] « cadence » joue I-IV-V-I dans chaque timbre.
- [ ] « stop » coupe net, y compris la queue de release (à l'oreille, appareil).
- [ ] Deux taps rapides sur « accord » ne superposent rien.
- [ ] Relancer « cadence » pendant une cadence remplace l'ancienne, sans accord fantôme.
- [ ] Aucune erreur console.
- [ ] iOS : son audible avec le commutateur silencieux ; verrouiller l'écran en pleine lecture puis revenir : l'UI ne reste pas bloquée.

## Coupure (stop / accord rapide)

`Sampler.triggerAttackRelease` programme déjà son relâchement, donc `releaseAll()` natif ne trouve plus de source à couper. Chaque timbre passe par un `Tone.Gain` dédié : `releaseAll()` fait un fondu 1 -> 0 en 50 ms, rouvre le gain 10 ms plus tard, et `play()` démarre au plus tôt à cette réouverture.

## Résultats (navigateur intégré, 375x812, Chrome)

Vérifié par script (`gain.getValueAtTime` sur la sortie de chaque voix après `releaseAll()`), pour piano, guitare et nappe : 1.00 à 0 s, 0.50 à 25 ms, 0.00 à 50-55 ms, 1.00 à 70 ms et au-delà ; trois `releaseAll()` consécutifs ne laissent pas le gain bloqué à 0. Chargement des trois timbres, cadence, stop, relance en cours de lecture, 0 erreur console.

Reste à vérifier à l'oreille sur appareil (non audible ici) : que « stop » coupe net, que deux taps rapides sur « accord » ne se superposent pas, la qualité sonore, et iOS (commutateur silencieux, écran verrouillé).
Le callback `onChord` (Tone.Draw, rAF) est peu fiable quand le panneau navigateur est masqué ; il ne sert qu'à l'animation.

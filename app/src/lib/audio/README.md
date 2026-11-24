# Moteur audio (Tone.js)

- `instruments.ts` : trois timbres (`piano` Salamander, `guitare` tonejs-instruments guitar-acoustic : D2 A2 D3 A3 D4 A4, `nappe` PolySynth fatsawtooth + passe-bas, sans réseau). Chargement idempotent, échec réessayable.
- `engine.ts` : `unlock`, `playSequence(chords, bpm, timbre, onChord?, beatsPerChord = 4)`, `playChord`, `playNote`, `stop`.
- `stop()` et toute nouvelle `playSequence` RÉSOLVENT la promesse de la séquence annulée : l'appelant doit ignorer la résolution s'il a lancé autre chose entre-temps (voir `runId` dans `routes/dev-audio.svelte`).

## Checklist navigateur (`/#dev-audio`)

- [ ] Les trois timbres se chargent (état « prêt »), erreur réseau -> « Réessayer ».
- [ ] « cadence » joue I-IV-V-I dans chaque timbre.
- [ ] « stop » coupe par un fondu bref (≈ 0,25 s piano/guitare, ≈ 80 ms nappe), sans queue de release audible (à l'oreille, appareil).
- [ ] Deux taps rapides sur « accord » ne superposent rien.
- [ ] Relancer « cadence » pendant une cadence remplace l'ancienne, sans accord fantôme.
- [ ] Aucune erreur console.
- [ ] iOS : son audible avec le commutateur silencieux ; verrouiller l'écran en pleine lecture puis revenir : l'UI ne reste pas bloquée.

## Coupure (stop / accord rapide)

Jamais de `triggerAttackRelease` : il planifie son relâchement immédiatement et vide les sources actives, donc `releaseAll()` ne couperait plus rien. Chaque voix fait `releaseAll(time)` puis `triggerAttack(notes, time)` (le nouvel accord coupe le précédent) ; la fin d'un accord isolé est un relâchement planifié (timer calé sur l'horloge audio) protégé par un `playId` : il ne fait rien si un jeu plus récent a eu lieu. En séquence, l'accord suivant relâche le précédent et l'événement de fin relâche le dernier. `stop()` relâche tout maintenant et neutralise les timers ; le relâchement des samplers (piano, guitare) est fixé à 0,25 s : il est figé à l'attaque dans chaque source, donc identique pour le legato entre accords et pour stop() (fondu d'environ 0,25 s, pas une coupure instantanée). La nappe relâche en 1,2 s en legato et 80 ms au stop (PolySynth lit le relâchement au moment du relâchement ; échange temporaire en try/finally).

## Résultats (navigateur intégré, 375x812, Chrome)

Vérifié par script, qui compte le registre interne (pas le silence audio) (sources actives du Sampler : `_activeSources`, de la nappe : `activeVoices`) : après un accord 4 sources ; 50 ms après `stop()` 0 (piano, guitare), nappe 0 à 250 ms ; deux accords rapides -> un seul accord actif (4) pour piano et guitare ; cadence puis stop -> 0 ; expiration d'un accord de durée 2n -> 0. Nappe : deux accords rapides laissent la queue de relâchement de 1,2 s du premier (legato voulu). Chargement des trois timbres, 0 erreur console.

Reste à vérifier à l'oreille sur appareil : que le fondu de « stop » (≈ 0,25 s piano/guitare, ≈ 80 ms nappe) est satisfaisant, que deux taps rapides ne se superposent pas audiblement, la qualité sonore, et iOS (commutateur silencieux, écran verrouillé).
Le callback `onChord` (Tone.Draw, rAF) est peu fiable quand le panneau navigateur est masqué ; il ne sert qu'à l'animation.

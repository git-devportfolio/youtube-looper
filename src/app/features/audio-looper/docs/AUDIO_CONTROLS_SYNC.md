# Synchronisation des Contrôles Audio

Ce document explique comment les différents contrôles audio (pitch, vitesse, volume, boucle) interagissent entre `ToneEngineService` et `RubberbandEngineService`.

## Architecture

```
┌─────────────────────┐
│   UI Components     │
│  (Contrôles User)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ToneEngineService   │ ◄── Service principal de coordination
│  (Orchestrateur)    │
└──────────┬──────────┘
           │
           ├──────────────────────────────────┐
           │                                  │
           ▼                                  ▼
┌──────────────────────┐         ┌────────────────────────┐
│ RubberbandEngine     │         │  Tone.js Player        │
│ (Pitch + Tempo)      │         │  (Lecture + Volume)    │
└──────────────────────┘         └────────────────────────┘
           │                                  │
           │                                  │
           ├──────────────────────────────────┤
           ▼                                  ▼
     Buffer Traité ───────────────────► Lecture Audio
```

## Contrôles et Responsabilités

### 1. Pitch Shift (-6 à +6 demi-tons)

**Géré par** : `RubberbandEngineService`

- **ToneEngineService** : Appelle `rubberbandEngine.setPitch(semitones)`
- **RubberbandEngineService** : Traite le buffer avec le pitch voulu
- **Tone.js Player** : Joue le buffer déjà traité (pas de pitch shift supplémentaire)

**Flux** :
```
UI → ToneEngine.setPitch() → RubberbandEngine.setPitch() → Buffer traité → Lecture
```

### 2. Playback Rate / Vitesse (0.5x, 0.75x, 1.0x)

**Géré par** : `RubberbandEngineService`

- **ToneEngineService** : Appelle `rubberbandEngine.setPlaybackRate(rate)`
- **RubberbandEngineService** : Traite le buffer avec le tempo voulu
- **Tone.js Player** : Joue à vitesse normale (1.0x) car le tempo est déjà appliqué dans le buffer

**⚠️ IMPORTANT** : Le player Tone.js **NE DOIT PAS** avoir son `playbackRate` modifié, sinon il y aurait un double effet de vitesse (Rubberband + Tone.js).

**Flux** :
```
UI → ToneEngine.setPlaybackRate() → RubberbandEngine.setPlaybackRate() → Buffer traité → Lecture à 1.0x
```

### 3. Volume

**Géré par** : `Tone.js Gain Node`

- **ToneEngineService** : Contrôle le `gainNode` directement
- **Chaîne audio** : `Player → Gain → Destination`

**Flux** :
```
UI → ToneEngine.setVolume() → gainNode.gain.value → Volume appliqué en temps réel
```

### 4. Boucle A/B (Loop Points)

**Géré par** : `Tone.js Player`

- **ToneEngineService** : Définit `player.loopStart` et `player.loopEnd`
- **Préservation** : Les points de boucle sont ajustés proportionnellement quand le buffer change (méthode `adjustLoopPoints()`)

**Flux** :
```
UI → ToneEngine.setLoopPoints() → player.loopStart/loopEnd → Boucle en lecture
```

**Ajustement automatique** :
- Quand le buffer change (nouveau pitch/tempo), la durée change
- Les points A/B sont recalculés proportionnellement
- Exemple : Si A=10s et B=20s sur un fichier de 60s, et que le nouveau buffer fait 45s (tempo 0.75x), alors A=7.5s et B=15s

## Ordre d'Exécution

### Changement de Pitch

1. **UI** : Utilisateur change le slider pitch
2. **ToneEngine** : `setPitch(semitones)` → `rubberbandEngine.setPitch(semitones)`
3. **RubberbandEngine** : Traite le buffer avec le nouveau pitch (debounce 500ms)
4. **RubberbandEngine** : Émet le buffer traité via `processedBufferSubject`
5. **ToneEngine** : Reçoit le buffer via subscription → `replaceAudioBuffer(newBuffer)`
6. **ToneEngine** : Ajuste les points de boucle A/B proportionnellement
7. **WaveformDisplay** : Régénère la waveform automatiquement (effect sur `duration`)

### Changement de Vitesse

1. **UI** : Utilisateur change la vitesse (0.5x, 0.75x, 1.0x)
2. **ToneEngine** : `setPlaybackRate(rate)` → `rubberbandEngine.setPlaybackRate(rate)`
3. **RubberbandEngine** : Traite le buffer avec le nouveau tempo (debounce 500ms)
4. **Reste identique** : Même flux que pour le pitch

### Changement de Volume

1. **UI** : Utilisateur change le slider volume
2. **ToneEngine** : `setVolume(value)` → `gainNode.gain.value = value`
3. **Application immédiate** : Pas de traitement de buffer nécessaire

### Définition Boucle A/B

1. **UI** : Utilisateur définit les points A et B
2. **ToneEngine** : `setLoopPoints(start, end)` → `player.loopStart/loopEnd`
3. **ToneEngine** : `toggleLoop()` → `player.loop = true`
4. **Préservation** : Si le buffer change, `adjustLoopPoints()` recalcule les points

## Optimisations

### Debounce (500ms)

Quand l'utilisateur change rapidement le pitch ou la vitesse, le traitement est debounced :
- Annulation des traitements en cours
- Attente de 500ms de stabilité
- Un seul traitement final

### Cache

Les buffers traités sont mis en cache avec une clé `p{pitch}_t{tempo}` :
- Exemple : `p2_t0.75` = pitch +2 demi-tons, tempo 0.75x
- Évite de retraiter le même buffer plusieurs fois

### Throttling des Messages de Progression (250ms)

Les messages de progression du Worker sont throttled pour éviter les re-renders excessifs.

## Cas d'Usage Courants

### Scénario 1 : Ralentir sans changer le pitch

```typescript
// L'utilisateur veut ralentir à 0.5x pour apprendre un passage rapide
setPlaybackRate(0.5);
// → RubberbandEngine traite avec tempo 0.5 (time stretch)
// → Le pitch reste inchangé (pas de voix de schtroumpf)
// → Le player joue à vitesse normale le buffer déjà ralenti
```

### Scénario 2 : Changer le pitch pour transposer

```typescript
// L'utilisateur veut monter de 2 demi-tons (ex: de Do à Ré)
setPitch(2);
// → RubberbandEngine traite avec pitch +2
// → La durée reste identique (pas de changement de vitesse)
// → Le player joue à vitesse normale le buffer déjà transposé
```

### Scénario 3 : Combiner pitch et vitesse

```typescript
// Ralentir ET monter le pitch
setPlaybackRate(0.5);  // Ralentir
setPitch(2);           // Monter de 2 demi-tons
// → RubberbandEngine traite avec BOTH tempo 0.5 ET pitch +2
// → Cache key: p2_t0.5
// → Le buffer résultant est ralenti ET transposé
```

## Tests de Synchronisation

### Test 1 : Pitch + Vitesse + Volume

```typescript
// 1. Charger un fichier audio
loadAudioFile(file);

// 2. Appliquer tous les contrôles
setPitch(3);           // +3 demi-tons
setPlaybackRate(0.75); // 75% vitesse
setVolume(0.5);        // 50% volume

// 3. Vérifier :
// - Le son est plus aigu (+3 demi-tons)
// - La lecture est plus lente (75%)
// - Le volume est à 50%
```

### Test 2 : Boucle A/B avec changement de buffer

```typescript
// 1. Charger un fichier (60 secondes)
// 2. Définir boucle A=10s, B=20s
setLoopPoints(10, 20);
toggleLoop();

// 3. Changer le pitch
setPitch(2);
// → Nouveau buffer généré (durée peut changer)
// → Les points A/B sont ajustés proportionnellement
// → La boucle continue de fonctionner
```

## Problèmes Connus et Solutions

### ❌ Problème : Double effet de vitesse

**Symptôme** : Le son est trop rapide/lent
**Cause** : Le `player.playbackRate` est modifié en plus du tempo Rubberband
**Solution** : Toujours garder `player.playbackRate = 1.0`

### ❌ Problème : Boucle A/B invalide après changement de buffer

**Symptôme** : La boucle ne fonctionne plus
**Cause** : Les points A/B dépassent la nouvelle durée
**Solution** : `adjustLoopPoints()` recalcule ou réinitialise si invalide

### ❌ Problème : Traitement trop fréquent

**Symptôme** : Lag quand l'utilisateur change rapidement le slider
**Cause** : Pas de debounce
**Solution** : Debounce de 500ms + annulation des traitements en cours

## Conclusion

La synchronisation entre les contrôles repose sur :
1. **ToneEngineService** comme orchestrateur central
2. **RubberbandEngineService** pour le traitement offline (pitch + tempo)
3. **Tone.js Player** pour la lecture en temps réel (volume + boucle)
4. **Préservation intelligente** des états (loop points, curseur de lecture)

Cette architecture permet des interactions fluides entre tous les contrôles sans conflits.

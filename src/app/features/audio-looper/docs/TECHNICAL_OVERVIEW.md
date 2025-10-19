# Audio Looper - Aperçu Technique

## Vue d'Ensemble

Le module **Audio Looper** permet la lecture et la manipulation de fichiers audio locaux avec des fonctionnalités avancées de contrôle audio, incluant le **pitch shifting de qualité professionnelle** grâce à **Rubberband WASM**.

## Architecture Technique

### Stack Technologique

| Technologie | Rôle | Version |
|-------------|------|---------|
| **Angular** | Framework frontend | 19.2 |
| **Tone.js** | Audio engine (lecture, volume, boucle) | Latest |
| **Rubberband WASM** | Pitch shifting et time stretching | Latest |
| **WebAssembly** | Traitement audio haute performance | - |
| **Web Workers** | Traitement audio en arrière-plan | - |
| **Canvas API** | Visualisation waveform | - |

### Services Principaux

#### 1. ToneEngineService
**Rôle** : Orchestrateur principal de l'audio

**Responsabilités** :
- Chargement des fichiers audio
- Lecture/pause/seek
- Gestion du volume (Gain Node)
- Gestion des boucles A/B
- Coordination avec RubberbandEngine

**Signals exposés** :
- `isPlaying`, `currentTime`, `duration`
- `playbackRate`, `loopStart`, `loopEnd`, `isLooping`
- `isReady`, `audioContextState`

**Méthodes clés** :
```typescript
loadAudioFile(file: File): Promise<void>
play(): void
pause(): void
seekTo(time: number): void
setPitch(semitones: number): void        // Délègue à Rubberband
setPlaybackRate(rate: number): void      // Délègue à Rubberband
setLoopPoints(start: number, end: number): void
```

#### 2. RubberbandEngineService
**Rôle** : Traitement audio offline (pitch + tempo)

**Responsabilités** :
- Initialisation du Web Worker Rubberband
- Traitement pitch shifting (-6 à +6 demi-tons)
- Traitement time stretching (0.5x, 0.75x, 1.0x)
- Cache intelligent des buffers traités
- Debounce et throttling des traitements

**Signals exposés** :
- `pitch`, `playbackRate`
- `isProcessing`, `processingProgress`, `processingStatus`
- `hasError`, `errorMessage`

**Méthodes clés** :
```typescript
loadOriginalBuffer(buffer: AudioBuffer): void
setPitch(semitones: number): void
setPlaybackRate(rate: number): void
getProcessedBuffer(): Observable<AudioBuffer>
clearCache(): void
```

**Optimisations** :
- **Cache** : Clé `p{pitch}_t{tempo}` (ex: `p2_t0.75`)
- **Debounce** : 500ms avant traitement
- **Throttling** : 250ms pour messages de progression
- **Timeout** : 60s pour éviter blocages
- **Annulation** : Traitements en cours annulés si paramètres changent

#### 3. BrowserCompatibilityService
**Rôle** : Détection de compatibilité navigateur

**Détections** :
- Support WebAssembly (test de module minimal)
- Support Web Workers
- Support AudioContext / Web Audio API
- Navigateur et version (Chrome, Firefox, Safari, Edge)
- Système d'exploitation
- Appareil mobile

**Warnings spécifiques** :
- Safari < 15 : Mise à jour recommandée
- iOS Safari : Performance limitée
- Firefox < 90 : Mise à jour recommandée

#### 4. AudioPlayerService
**Rôle** : Facade simplifiant l'accès à ToneEngine

**Méthodes exposées** :
```typescript
loadAudioFile(file: File): Promise<void>
play(): void
pause(): void
seekTo(time: number): void
```

#### 5. WaveformService
**Rôle** : Génération et affichage de la waveform

**Fonctionnalités** :
- Génération des peaks audio via Web Workers
- Dessin sur Canvas avec optimisation
- Affichage responsive

### Composants UI

#### 1. AudioLooperContainerComponent
**Rôle** : Container principal du module

**États** :
- `empty` : Aucun fichier chargé
- `loading` : Chargement en cours
- `loaded` : Fichier chargé et prêt
- `error` : Erreur de chargement

**Révélation progressive** :
- Upload centré en mode vide
- Contrôles révélés après chargement

#### 2. FileUploadComponent
**Rôle** : Upload de fichiers audio

**Formats supportés** :
- MP3, WAV, OGG, M4A
- Taille max : 10 Mo

**UI** : Drag & drop + bouton parcourir

#### 3. WaveformDisplayComponent
**Rôle** : Affichage et interaction avec la waveform

**Fonctionnalités** :
- Affichage forme d'onde
- Curseur de lecture animé
- Clic pour naviguer
- Régénération automatique (effect sur duration)

#### 4. AudioPlayerComponent
**Rôle** : Contrôles de lecture

**Boutons** :
- Play/Pause
- Affichage temps courant / durée

#### 5. RubberbandPitchControlComponent
**Rôle** : Contrôle du pitch shifting

**UI** :
- Slider -6 à +6 demi-tons
- Affichage valeur courante
- Bouton Reset Pitch
- Barre de progression du traitement
- Affichage des erreurs

### Web Worker Rubberband

**Fichier** : `rubberband.worker.ts`

**Flux de traitement** :

```
1. Initialisation
   ├─ Chargement rubberband.umd.min.js via fetch + eval
   ├─ Compilation WASM via WebAssembly.compileStreaming
   └─ Initialisation RubberBandInterface

2. Réception message de traitement
   ├─ Validation des entrées (channelBuffers, sampleRate, pitch, tempo)
   ├─ Création état Rubberband
   └─ Application pitch scale et time ratio

3. Phase Study (0-50%)
   ├─ Analyse de l'audio
   └─ Messages de progression throttlés (250ms)

4. Phase Process (50-100%)
   ├─ Traitement audio
   └─ Récupération des échantillons traités

5. Émission du résultat
   ├─ Envoi des buffers traités
   └─ Libération de la mémoire
```

**Gestion d'erreurs** :
- Erreur initialisation WASM
- Erreur validation entrées
- Erreur traitement audio

## Flux de Données

### Chargement d'un fichier

```
User → FileUpload
     → AudioLooperContainer.onFileSelected()
     → AudioPlayerService.loadAudioFile()
     → ToneEngineService.loadAudioFile()
     → Tone.Player (chargement)
     → ToneEngine.originalAudioBuffer = buffer
     → RubberbandEngine.loadOriginalBuffer(buffer)
     → WaveformService.generateWaveform(buffer)
```

### Changement de Pitch

```
User → RubberbandPitchControl (slider)
     → ToneEngine.setPitch(semitones)
     → RubberbandEngine.setPitch(semitones)
     → Debounce 500ms
     → RubberbandEngine.processAudio()
     → Web Worker (traitement)
     → RubberbandEngine (réception buffer traité)
     → Cache (p{pitch}_t{tempo})
     → processedBufferSubject.next(buffer)
     → ToneEngine.replaceAudioBuffer(buffer)
     → ToneEngine.adjustLoopPoints() si nécessaire
     → WaveformDisplay (régénération via effect)
```

### Lecture Audio

```
User → AudioPlayer (Play)
     → AudioPlayerService.play()
     → ToneEngine.play()
     → Tone.Player.start()
     → Chaîne audio: Player → Gain → Destination
     → Sortie audio
```

## Optimisations

### 1. Cache Intelligent

**Stratégie** :
- Clé : `p{pitch}_t{tempo}` (ex: `p2_t0.75`)
- Stockage : Map<string, AudioBuffer>
- Éviction : Manuelle via `clearCache()`

**Bénéfice** :
- Évite retraitement si même paramètres
- Changement rapide entre presets

### 2. Debounce (500ms)

**Problème résolu** :
- Utilisateur change rapidement le slider
- Évite 10+ traitements inutiles

**Implémentation** :
- Timer réinitialisé à chaque changement
- Traitement lancé 500ms après stabilité

### 3. Throttling Progression (250ms)

**Problème résolu** :
- Worker envoie 100+ messages/sec
- Évite re-renders excessifs

**Implémentation** :
- Mise à jour max toutes les 250ms
- Exceptions : 0% et 100%

### 4. Annulation Traitements

**Problème résolu** :
- Paramètres changent pendant traitement
- Traiter des valeurs obsolètes

**Implémentation** :
- Worker détruit si nouveaux paramètres
- Nouveau traitement avec valeurs courantes

### 5. Timeout (60s)

**Problème résolu** :
- Traitement bloqué/infini
- Application freeze

**Implémentation** :
- Timer 60s démarré avec traitement
- Destruction worker si dépassement

## Gestion d'Erreurs

### Niveaux d'Erreur

1. **Compatibilité navigateur**
   - Détection WebAssembly manquant
   - Message clair + recommandation

2. **Initialisation Worker**
   - Fichier WASM manquant
   - Erreur compilation WASM
   - Message dans console + UI

3. **Traitement audio**
   - Validation entrées
   - Timeout dépassé
   - Erreur Worker
   - Affichage message d'erreur dans UI

4. **Playback**
   - Fichier audio invalide
   - AudioContext bloqué
   - Gestion dans ToneEngine

### Stratégie de Fallback

**Pas de fallback vers Tone.js PitchShift** car supprimé.

**En cas d'erreur** :
- Message clair à l'utilisateur
- Proposition de réessayer
- Suggestion mise à jour navigateur si nécessaire

## Performances

### Métriques Attendues

| Opération | Temps | Notes |
|-----------|-------|-------|
| **Chargement fichier 3min** | < 1s | Lecture + waveform |
| **Pitch shift ±3 demi-tons** | 1-3s | Fichier 3min MP3 |
| **Pitch shift ±6 demi-tons** | 2-5s | Fichier 3min MP3 |
| **Cache hit** | < 100ms | Récupération instantanée |
| **Régénération waveform** | < 500ms | Après changement buffer |

### Optimisations Canvas

- Device Pixel Ratio géré
- Redraw uniquement si nécessaire
- Throttling des animations (60 FPS)

## Compatibilité Navigateur

### Support Complet

✅ **Chrome** 90+ (Windows, macOS, Linux, Android)
✅ **Edge** 90+ (Windows, macOS)
✅ **Firefox** 90+ (Windows, macOS, Linux)
✅ **Safari** 15+ (macOS, iOS)

### Support Partiel

⚠️ **Safari** < 15 : Problèmes WebAssembly
⚠️ **iOS Safari** : Performance limitée
⚠️ **Firefox** < 90 : Performance sous-optimale

### Non Supporté

❌ Internet Explorer (tous)
❌ Navigateurs sans WebAssembly

## Tests de Qualité

Voir `AUDIO_QUALITY_TESTING.md` pour le protocole complet.

**Résumé** :
- Rubberband offre qualité supérieure à Tone.js
- Timbre préservé (voix, instruments)
- Artefacts minimaux même à ±6 demi-tons
- Son naturel pour apprentissage musical

## Synchronisation des Contrôles

Voir `AUDIO_CONTROLS_SYNC.md` pour les détails complets.

**Principes** :
- **Pitch/Tempo** : Rubberband (traitement offline dans buffer)
- **Volume** : Tone.js Gain (temps réel)
- **Boucle A/B** : Tone.js Player (temps réel, ajustement auto)
- **Player playbackRate** : Toujours 1.0x (tempo déjà dans buffer)

## Maintenance

### Logs Conservés

Les `console.log/warn/error` sont **conservés** car :
- Utiles pour debugging production
- Désactivables via build optimization
- Fournissent contexte pour support utilisateur

### Code Mort

Aucun code mort détecté :
- Tous les services utilisés
- Tous les composants intégrés
- Worker nécessaire

### Imports

Tous les imports sont optimisés :
- Barrel exports via `index.ts`
- Pas de circular dependencies
- Tree-shaking compatible

## Points d'Amélioration Futurs

### Fonctionnalités
- [ ] Support de fichiers > 10 Mo
- [ ] Prévisualisation audio avant traitement
- [ ] Sauvegarde des presets utilisateur
- [ ] Export audio traité

### Performance
- [ ] Web Worker pool pour fichiers longs
- [ ] Streaming processing pour gros fichiers
- [ ] Service Worker pour cache persistant

### UX
- [ ] Raccourcis clavier
- [ ] Visualisation temps réel pendant traitement
- [ ] Undo/Redo des changements

## Conclusion

Le module Audio Looper avec Rubberband WASM offre une solution professionnelle de pitch shifting pour l'apprentissage musical, avec :

✅ Qualité audio supérieure
✅ Architecture robuste et maintenable
✅ Optimisations performantes
✅ Gestion d'erreurs complète
✅ Documentation technique exhaustive

**Objectif du PRD atteint** 🎯

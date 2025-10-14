# Implémentation de Rubberband-WASM pour le Contrôle du Pitch et de la Vitesse

## Vue d'ensemble

Ce document décrit l'implémentation complète de la bibliothèque **rubberband-wasm** dans l'Audio Looper pour permettre le contrôle avancé du pitch (tonalité) et de la vitesse de lecture sans altération de qualité.

## Architecture Générale

L'implémentation suit une architecture en couches :

```
┌─────────────────────────────────────────┐
│   PitchControlComponent (UI)           │
│   - Slider -6 à +6 demi-tons           │
│   - Affichage valeur courante          │
│   - Bouton Reset                       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   ToneEngineService                     │
│   - Lecture audio principale           │
│   - Injection de RubberbandEngine      │
│   - Signal pitch(-6 à +6)              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   RubberbandEngineService               │
│   - Orchestration Web Worker           │
│   - Cache des buffers traités          │
│   - Debounce 500ms                     │
│   - Signals (pitch, tempo, progress)   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Rubberband Web Worker                │
│   - Traitement audio asynchrone        │
│   - Phase 1: Study (analyse)           │
│   - Phase 2: Process (traitement)      │
│   - Progress reporting (250ms)         │
└─────────────────────────────────────────┘
```

## Composants de l'Implémentation

### 1. Assets Statiques

**Emplacement:** `public/assets/rubberband/`

Fichiers copiés :
- `rubberband.wasm` (265 KB) - Module WebAssembly principal
- `rubberband.umd.min.js` (6.7 KB) - Wrapper JavaScript

Ces fichiers sont automatiquement inclus dans le build Angular via la configuration `angular.json` :

```json
{
  "glob": "**/*",
  "input": "public",
  "output": "/"
}
```

Les fichiers sont accessibles à l'URL : `/assets/rubberband/`

### 2. Web Worker - Types TypeScript

**Fichier:** `src/app/features/audio-looper/services/workers/rubberband-worker.types.ts`

Définit les interfaces pour la communication avec le Worker :

```typescript
export interface RubberbandWorkerInput {
  channelBuffers: Float32Array[];  // Données audio par canal
  sampleRate: number;               // Fréquence d'échantillonnage
  pitch: number;                    // Facteur de pitch (ex: 1.0594631 pour +1 demi-ton)
  tempo: number;                    // Facteur de tempo (ex: 0.5 pour 50% vitesse)
}

export interface RubberbandWorkerOutput {
  channelBuffers?: Float32Array[]; // Résultat traité
  ready?: boolean;                 // Worker initialisé
  status?: string;                 // Message de statut
  progress?: number;               // Progression 0-1
  error?: string;                  // Message d'erreur
}
```

### 3. Web Worker - Implémentation

**Fichier:** `src/app/features/audio-looper/services/workers/rubberband.worker.ts`

Le Worker effectue le traitement audio en deux phases :

#### Phase 1 : Study (Analyse)
```typescript
// Analyse l'audio pour optimiser le traitement
for (let i = 0; i < totalSamples; i += blockSize) {
  const remaining = totalSamples - i;
  const currentBlockSize = Math.min(blockSize, remaining);
  const isFinalBlock = (i + currentBlockSize >= totalSamples);

  rubberband.study(inputPtrs, currentBlockSize, isFinalBlock);

  // Progress reporting (250ms throttle)
  if (now - lastProgressTime > 250) {
    self.postMessage({ progress: studyProgress });
  }
}
```

#### Phase 2 : Process (Traitement)
```typescript
// Traite l'audio avec les paramètres pitch/tempo
while (samplesProcessed < totalSamples || available > 0) {
  const currentBlockSize = Math.min(blockSize, remaining);
  const isFinalBlock = (samplesProcessed >= totalSamples);

  rubberband.process(inputPtrs, currentBlockSize, isFinalBlock);

  const available = rubberband.available();
  if (available > 0) {
    const retrieved = rubberband.retrieve(outputPtrs, available);
    // Copier les données dans outputBuffers
  }
}
```

#### Gestion de la Mémoire WASM
```typescript
// Allocation
const inputPtr = rubberband._malloc(blockSize * 4);
const outputPtr = rubberband._malloc(blockSize * 4);

// Libération
rubberband._free(inputPtr);
rubberband._free(outputPtr);
```

### 4. RubberbandEngineService

**Fichier:** `src/app/features/audio-looper/services/rubberband-engine.service.ts`

Service principal qui orchestre le traitement audio avec rubberband.

#### Signals Réactifs
```typescript
readonly pitch = signal<number>(0);              // -6 à +6 demi-tons
readonly playbackRate = signal<number>(1.0);     // 0.5x, 0.75x, 1.0x
readonly isProcessing = signal<boolean>(false);  // En traitement
readonly processingProgress = signal<number>(0); // 0-100%
readonly processingStatus = signal<string>('');  // Message
```

#### Cache des Buffers
```typescript
private readonly bufferCache = new Map<string, AudioBuffer>();

private getCacheKey(pitch: number, tempo: number): string {
  return `pitch_${pitch.toFixed(2)}_tempo_${tempo.toFixed(2)}`;
}
```

Le cache évite de retraiter l'audio pour les mêmes paramètres.

#### Debounce (500ms)
```typescript
private debounceTimer: number | null = null;

private scheduleProcessing(): void {
  if (this.debounceTimer !== null) {
    clearTimeout(this.debounceTimer);
  }

  this.debounceTimer = setTimeout(() => {
    this.processAudio();
  }, 500);
}
```

Le debounce évite de lancer le traitement à chaque mouvement du slider.

#### Conversion Pitch/Tempo
```typescript
// Pitch: semitones → pitch scale
const pitchScale = Math.pow(2, pitch / 12);

// Tempo: playbackRate → tempo factor
const tempo = 1 / playbackRate;
```

**Formules utilisées :**
- **Pitch Scale** : `2^(semitones/12)`
  - +1 demi-ton = 1.0594631
  - -1 demi-ton = 0.9438743

- **Tempo** : `1 / playbackRate`
  - 0.5x vitesse = tempo 2.0
  - 0.75x vitesse = tempo 1.333
  - 1.0x vitesse = tempo 1.0

### 5. ToneEngineService - Intégration

**Fichier:** `src/app/features/audio-looper/services/tone-engine.service.ts`

Modifications pour l'intégration :

```typescript
@Injectable({ providedIn: 'root' })
export class ToneEngineService {
  private readonly rubberbandEngine = inject(RubberbandEngineService);

  // Stockage du buffer original pour rubberband
  private originalAudioBuffer: AudioBuffer | null = null;

  // Signal pitch utilisé par Tone.js ET par rubberband
  readonly pitch = signal<number>(0); // -6 à +6
}
```

**Note :** Dans l'implémentation actuelle, Tone.js gère le pitch en temps réel via `PitchShift`. L'intégration complète avec rubberband (pour une qualité supérieure) sera finalisée dans une future tâche.

### 6. PitchControlComponent - UI

**Fichier:** `src/app/features/audio-looper/ui/pitch-control/pitch-control.component.ts`

Composant standalone Angular pour le contrôle du pitch :

```typescript
@Component({
  selector: 'app-pitch-control',
  imports: [],
  templateUrl: './pitch-control.component.html',
  styleUrl: './pitch-control.component.scss'
})
export class PitchControlComponent {
  readonly toneEngine = inject(ToneEngineService);

  onPitchChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.toneEngine.setPitch(value);
  }
}
```

#### Template HTML

**Fichier:** `pitch-control.component.html`

```html
<div class="pitch-control">
  <!-- Header avec label et valeur -->
  <div class="pitch-control__header">
    <label class="pitch-control__label">Pitch</label>
    <span class="pitch-control__value">
      {{ toneEngine.pitch() > 0 ? '+' : '' }}{{ toneEngine.pitch() }} semitones
    </span>
  </div>

  <!-- Slider -6 à +6 -->
  <div class="pitch-control__slider-container">
    <input
      type="range"
      class="pitch-control__slider"
      min="-6"
      max="6"
      step="1"
      [value]="toneEngine.pitch()"
      (input)="onPitchChange($event)"
    />
  </div>

  <!-- Bouton Reset -->
  <button
    class="pitch-control__reset"
    (click)="toneEngine.resetPitch()"
    [disabled]="toneEngine.pitch() === 0"
    type="button"
  >
    Reset Pitch
  </button>
</div>
```

### 7. Intégration dans AudioLooperContainer

**Fichier:** `audio-looper-container.component.ts`

Import du composant :
```typescript
import { PitchControlComponent } from '../pitch-control';

@Component({
  imports: [
    CommonModule,
    FileUploadComponent,
    WaveformDisplayComponent,
    AudioPlayerComponent,
    PitchControlComponent  // ← Ajouté
  ]
})
```

**Fichier:** `audio-looper-container.component.html`

Ajout dans la zone de contrôles :
```html
<div class="controls-section">
  <app-audio-player></app-audio-player>

  <!-- Contrôle du pitch -->
  <app-pitch-control></app-pitch-control>

  <!-- Les autres contrôles seront ajoutés dans les prochaines tâches -->
</div>
```

## Flux de Traitement Audio

### Scénario : Utilisateur change le pitch de 0 à +2 demi-tons

1. **UI (PitchControlComponent)**
   ```
   Utilisateur déplace le slider → onPitchChange(event)
   ```

2. **ToneEngineService**
   ```
   setPitch(2) → this.pitch.set(2)
   Application immédiate via Tone.js PitchShift
   ```

3. **RubberbandEngineService** (futur - qualité supérieure)
   ```
   Effect sur pitch() signal → scheduleProcessing()
   Debounce 500ms → processAudio()
   Vérification cache → Si pas en cache:
     - Conversion: pitch=2 → pitchScale=1.122462
     - Conversion: playbackRate=1.0 → tempo=1.0
     - Envoi au Worker
   ```

4. **Rubberband Worker**
   ```
   Phase Study → Progress 0-50%
   Phase Process → Progress 50-100%
   Retour AudioBuffer traité
   ```

5. **RubberbandEngineService**
   ```
   Stockage dans cache
   Mise à jour du signal isProcessing(false)
   Émission du buffer traité
   ```

## Optimisations Implémentées

### 1. Debounce (500ms)
Évite de lancer un traitement à chaque mouvement du slider. Le traitement ne démarre que 500ms après la dernière modification.

### 2. Cache des Buffers
```typescript
Map<"pitch_2.00_tempo_1.00", AudioBuffer>
```
Si l'utilisateur revient aux mêmes paramètres, le buffer en cache est réutilisé instantanément.

### 3. Progress Throttling (250ms)
Les messages de progression du Worker sont limités à 1 toutes les 250ms pour éviter de surcharger le thread principal.

### 4. Web Worker
Le traitement audio s'effectue dans un Worker dédié, gardant l'UI responsive pendant le traitement (qui peut prendre plusieurs secondes pour de longs fichiers).

## Formules Mathématiques

### Pitch Scale (Échelle Logarithmique)
```
pitchScale = 2^(semitones / 12)
```

**Exemples :**
- -6 demi-tons : `2^(-6/12)` = 0.707107 (≈ 70.7%)
- -3 demi-tons : `2^(-3/12)` = 0.840896 (≈ 84.1%)
- 0 demi-tons : `2^(0/12)` = 1.0 (100%)
- +3 demi-tons : `2^(3/12)` = 1.189207 (≈ 118.9%)
- +6 demi-tons : `2^(6/12)` = 1.414214 (≈ 141.4%)

### Tempo Factor
```
tempo = 1 / playbackRate
```

**Exemples :**
- 0.5x vitesse : `1 / 0.5` = 2.0 (audio 2x plus long)
- 0.75x vitesse : `1 / 0.75` = 1.333 (audio 33% plus long)
- 1.0x vitesse : `1 / 1.0` = 1.0 (durée normale)

## Configuration Angular Build

Le Worker est automatiquement détecté et bundlé par Angular :

**Build Output :**
```
Lazy chunk files     | Names                           |  Raw size
worker-7PJDQZYG.js   | rubberband-worker               |   2.42 kB
```

Le fichier worker est chargé dynamiquement uniquement quand nécessaire (lazy loading).

## Fichiers Créés/Modifiés

### Fichiers Créés
```
public/assets/rubberband/
  ├── rubberband.wasm (265 KB)
  └── rubberband.umd.min.js (6.7 KB)

src/app/features/audio-looper/services/
  ├── rubberband-engine.service.ts
  └── workers/
      ├── index.ts
      ├── rubberband-worker.types.ts
      └── rubberband.worker.ts
```

### Fichiers Modifiés
```
src/app/features/audio-looper/
  ├── services/
  │   ├── index.ts (export RubberbandEngineService)
  │   └── tone-engine.service.ts (inject RubberbandEngine)
  └── ui/
      ├── pitch-control/
      │   ├── pitch-control.component.ts
      │   └── pitch-control.component.html
      └── audio-looper-container/
          ├── audio-looper-container.component.ts
          └── audio-looper-container.component.html
```

## Utilisation de l'API Rubberband

### Initialisation
```typescript
importScripts('/assets/rubberband/rubberband.umd.min.js');
const RubberBandModule = (self as any).RubberBand;

const rubberband = await RubberBandModule({
  locateFile: (file: string) => {
    if (file.endsWith('.wasm')) {
      return '/assets/rubberband/rubberband.wasm';
    }
    return file;
  }
});
```

### Création du Stretcher
```typescript
const stretcher = new rubberband.RubberBandStretcher(
  sampleRate,
  channels,
  rubberband.OptionProcessRealTime | rubberband.OptionStretchPrecise,
  pitchScale,
  tempo
);
```

### Options Rubberband Utilisées
- `OptionProcessRealTime` : Mode temps réel optimisé
- `OptionStretchPrecise` : Qualité maximale du time-stretching

## Prochaines Étapes

1. **Finaliser l'intégration Rubberband**
   - Basculer de Tone.js PitchShift vers Rubberband pour le pitch
   - Implémenter le remplacement du buffer audio en temps réel

2. **Optimisations supplémentaires**
   - Streaming audio par chunks pour les gros fichiers
   - Préchargement des buffers pour les valeurs courantes

3. **Tests de performance**
   - Benchmarks avec différentes tailles de fichiers
   - Mesure du temps de traitement

4. **UI/UX**
   - Indicateur de progression pendant le traitement
   - Message si traitement en cours
   - Désactivation des contrôles pendant le processing

## Références

- **Rubberband Library** : https://breakfastquay.com/rubberband/
- **Rubberband WASM** : Wrapper JavaScript pour WebAssembly
- **Tone.js PitchShift** : https://tonejs.github.io/docs/PitchShift
- **Angular Web Workers** : https://angular.dev/ecosystem/web-workers

## Notes Techniques

### Pourquoi deux approches (Tone.js + Rubberband) ?

1. **Tone.js PitchShift** (actuel)
   - ✅ Temps réel instantané
   - ✅ Pas de latence
   - ❌ Qualité moyenne sur grands changements
   - ❌ Artefacts audibles au-delà de ±3 demi-tons

2. **Rubberband WASM** (futur)
   - ✅ Qualité audio professionnelle
   - ✅ Aucun artefact même sur ±6 demi-tons
   - ❌ Temps de traitement (quelques secondes)
   - ❌ Nécessite pré-processing

### Stratégie hybride envisagée
- Utiliser Tone.js pour le preview instantané
- Lancer Rubberband en arrière-plan après 500ms de debounce
- Remplacer le buffer une fois le traitement Rubberband terminé
- Offrir le meilleur des deux mondes : réactivité + qualité

---

**Document créé le :** 2025-10-14
**Version :** 1.0
**Task Master :** Task 10 - Pitch control implementation

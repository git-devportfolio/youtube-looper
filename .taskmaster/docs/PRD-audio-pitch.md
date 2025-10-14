# PRD - Intégration Rubberband-WASM pour Contrôle Avancé du Pitch

## 1. Objectif

Améliorer le module Audio Looper existant en remplaçant le pitch shift basique de Tone.js par l'algorithme de qualité professionnelle **rubberband-wasm**. Cette amélioration permettra aux utilisateurs de modifier la tonalité de leurs fichiers audio de -6 à +6 demi-tons **sans dégradation de qualité**, même sur de grands changements de pitch.

## 2. Contexte

### 2.1 Situation actuelle

Le module Audio Looper utilise actuellement **Tone.js PitchShift** pour le contrôle du pitch (non encore implémenté) :
- ✅ Temps réel instantané (pas de latence)
- ✅ Réactivité immédiate
- ❌ Qualité moyenne sur changements > ±3 demi-tons
- ❌ Artefacts audibles (distorsion, phasing, chipmunk effect)

**Fichiers existants :**
- `src/app/features/audio-looper/ui/pitch-control/` - UI du contrôle pitch (slider -6 à +6)
- `src/app/features/audio-looper/services/tone-engine.service.ts` - Gestion audio avec Tone.js

### 2.2 Solution cible : Rubberband-WASM

**Rubberband** est une bibliothèque audio professionnelle utilisée dans les DAWs (Digital Audio Workstations) pour le pitch shifting et le time-stretching de qualité studio.

**Avantages de rubberband-wasm :**
- ✅ Qualité audio professionnelle (niveau DAW)
- ✅ Aucun artefact même sur ±6 demi-tons
- ✅ Algorithme éprouvé (utilisé par Audacity, Ardour, etc.)
- ✅ Version WebAssembly optimisée pour le web
- ❌ Temps de traitement nécessaire (quelques secondes)
- ❌ Nécessite pré-processing de l'audio

### 2.3 Démo fonctionnelle existante

Une démo HTML/JS fonctionnelle existe dans `.ai/rubberband-wasm/` :
- `index.html` - Interface de test
- `main.js` - Logique principale
- `worker.js` - Web Worker pour le traitement
- `wav.js` - Encodeur WAV
- `rubberband.wasm` - Module WebAssembly (265 KB)
- `rubberband.umd.min.js` - Wrapper JavaScript (6.7 KB)

**Cette démo fonctionne parfaitement** et doit être refactorisée pour s'intégrer dans l'architecture Angular existante.

## 3. Périmètre de l'implémentation

### 3.1 Architecture cible

```
┌─────────────────────────────────────────┐
│   PitchControlComponent (UI)           │
│   - Slider -6 à +6 demi-tons           │
│   - Affichage valeur courante          │
│   - Bouton Reset                       │
│   - Indicateur de progression          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   ToneEngineService                     │
│   - Lecture audio principale           │
│   - Injection de RubberbandEngine      │
│   - Gestion du buffer audio            │
│   - Synchronisation pitch/playback     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   RubberbandEngineService               │
│   - Orchestration Web Worker           │
│   - Cache des buffers traités          │
│   - Debounce 500ms                     │
│   - Signals (pitch, progress, status)  │
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

### 3.2 Composants à créer/modifier

#### Fichiers à créer

**Assets statiques** (copie depuis `.ai/rubberband-wasm/`) :
```
public/assets/rubberband/
├── rubberband.wasm (265 KB)
└── rubberband.umd.min.js (6.7 KB)
```

**Web Worker** :
```
src/app/features/audio-looper/services/workers/
├── index.ts
├── rubberband-worker.types.ts    # Interfaces TypeScript
└── rubberband.worker.ts          # Logique du Worker
```

**Service Angular** :
```
src/app/features/audio-looper/services/
└── rubberband-engine.service.ts  # Orchestration rubberband
```

#### Fichiers à modifier

**ToneEngineService** (`tone-engine.service.ts`) :
- Injecter `RubberbandEngineService`
- Stocker le `AudioBuffer` original pour rubberband
- Gérer le remplacement du buffer après traitement
- Synchroniser la position de lecture lors du changement de buffer

**PitchControlComponent** (`pitch-control.component.ts`) :
- Afficher un indicateur de progression pendant le traitement
- Afficher le statut de traitement ("Studying...", "Processing...")
- Gérer l'état "en traitement" (optionnel : désactiver le slider)

**AudioPlayerComponent** (`audio-player.component.ts`) :
- Gérer la lecture fluide lors du changement de buffer
- Conserver la position de lecture lors du remplacement

**WaveformDisplayComponent** (`waveform-display.component.ts`) :
- Régénérer la waveform après traitement rubberband (le buffer change)
- Conserver les marqueurs A/B et la position de lecture

### 3.3 Hors périmètre

**Non inclus dans cette version :**
- Export du fichier audio traité (WAV)
- Contrôle avancé du tempo via rubberband (utilise déjà Tone.js)
- Stratégie hybride (Tone.js preview + rubberband final) - future optimisation
- Streaming audio par chunks (traite le fichier complet)

## 4. Fonctionnalités détaillées

### 4.1 Workflow utilisateur

#### Scénario nominal : Changement de pitch

1. **Utilisateur charge un fichier audio** (ex: `song.mp3`)
   - Fichier chargé via `ToneEngineService`
   - Buffer audio original stocké
   - Pitch actuel : 0 demi-tons

2. **Utilisateur déplace le slider à +3 demi-tons**
   - UI : Affichage immédiat "+3 semitones"
   - UI : Indicateur "Traitement en cours..." (barre de progression 0%)
   - Backend : Debounce 500ms activé

3. **500ms après la dernière modification**
   - `RubberbandEngineService` démarre le traitement
   - Vérification du cache (pas trouvé pour pitch=+3)
   - Envoi du message au Worker avec :
     - `channelBuffers`: données audio originales
     - `sampleRate`: 44100 Hz
     - `pitch`: 1.189207 (= 2^(3/12))
     - `tempo`: 1.0 (vitesse normale)

4. **Worker : Phase Study (0-50%)**
   - Analyse de l'audio pour optimiser le traitement
   - Progress updates toutes les 250ms
   - UI : "Analyzing audio... 25%"

5. **Worker : Phase Process (50-100%)**
   - Traitement pitch shift
   - Progress updates toutes les 250ms
   - UI : "Processing audio... 75%"

6. **Traitement terminé**
   - Worker retourne le buffer traité
   - `RubberbandEngineService` stocke dans le cache
   - `ToneEngineService` remplace le buffer audio
   - Lecture reprend à la même position
   - UI : Indicateur "Traitement en cours" disparaît

7. **Utilisateur peut écouter l'audio avec pitch +3**
   - Lecture continue normalement
   - Waveform mise à jour (si nécessaire)
   - Marqueurs A/B conservés

#### Scénario : Cache hit

1. **Utilisateur passe de +3 à +5 demi-tons**
   - Traitement lancé (3-4 secondes)

2. **Utilisateur revient à +3 demi-tons**
   - Cache hit → Remplacement instantané du buffer
   - Aucun traitement nécessaire

### 4.2 Interface utilisateur (PitchControlComponent)

**État normal (pas de traitement)** :
```
┌────────────────────────────────────────┐
│  Pitch                   +3 semitones  │
│  [-6 ←─────●────────→ +6]              │
│  [Reset Pitch]                         │
└────────────────────────────────────────┘
```

**État traitement en cours** :
```
┌────────────────────────────────────────┐
│  Pitch                   +3 semitones  │
│  [-6 ←─────●────────→ +6]              │
│  [Reset Pitch]                         │
│                                        │
│  ⏳ Processing audio...           75%  │
│  [████████████░░░░░░]                  │
└────────────────────────────────────────┘
```

**Éléments visuels** :
- Barre de progression (0-100%)
- Message de statut ("Analyzing...", "Processing...")
- Pourcentage numérique
- Optionnel : Icône spinner animé

### 4.3 Gestion de l'état pendant le traitement

**Cas 1 : Lecture en cours pendant le traitement**
- Option A : Continuer la lecture avec l'ancien buffer jusqu'à la fin du traitement
- Option B : Pause automatique pendant le traitement
- **Recommandation : Option A** (meilleure UX, pas d'interruption)

**Cas 2 : Utilisateur change de pitch pendant un traitement**
- Annuler le traitement en cours (Worker.terminate())
- Lancer un nouveau traitement avec le nouveau pitch
- Debounce 500ms pour éviter les traitements multiples

**Cas 3 : Utilisateur clique sur une autre position (seekTo)**
- Continuer le traitement en arrière-plan
- Seek sur le buffer actuel
- Quand le traitement est terminé, conserver la position de lecture

**Cas 4 : Utilisateur change la vitesse (playback rate)**
- Indépendant du pitch (géré par Tone.js)
- Pas d'impact sur le traitement rubberband en cours
- La vitesse s'applique au buffer rubberband une fois chargé

**Cas 5 : Utilisateur modifie les marqueurs A/B**
- Indépendant du pitch
- Les marqueurs restent aux mêmes positions temporelles
- La waveform peut changer visuellement, mais les marqueurs suivent

### 4.4 Impacts sur les autres fonctionnalités

#### Waveform Display
**Problème** : Le buffer audio change après traitement rubberband → la waveform doit être régénérée.

**Solution** :
1. `WaveformDisplayComponent` écoute les changements du buffer audio
2. Quand le buffer change, régénère la waveform
3. Conserve la position de lecture (curseur)
4. Conserve les marqueurs A et B (en secondes, pas en pixels)

**Code suggéré** :
```typescript
// waveform-display.component.ts
effect(() => {
  const buffer = this.audioBuffer();
  if (buffer) {
    this.regenerateWaveform(buffer);
  }
});
```

#### Audio Player
**Problème** : La lecture est en cours, le buffer est remplacé → risque de coupure audio.

**Solution** :
1. Sauvegarder la position de lecture actuelle (en secondes)
2. Sauvegarder l'état (playing/paused)
3. Remplacer le buffer
4. Restaurer la position de lecture
5. Restaurer l'état (reprendre la lecture si nécessaire)

**Code suggéré** :
```typescript
// tone-engine.service.ts
replaceBuffer(newBuffer: AudioBuffer): void {
  const currentPosition = this.currentTime();
  const wasPlaying = this.isPlaying();

  if (wasPlaying) {
    this.pause();
  }

  // Remplacer le buffer du player
  this.player.buffer = newBuffer;

  if (wasPlaying) {
    this.seekTo(currentPosition);
    this.play();
  } else {
    this.seekTo(currentPosition);
  }
}
```

#### Loop Controls (Marqueurs A/B)
**Problème** : Les marqueurs A/B sont définis en secondes. Le buffer change, la durée peut légèrement changer.

**Solution** :
- Les marqueurs A/B sont stockés en secondes (pas en samples)
- Quand le buffer change, vérifier que A et B sont toujours dans la plage valide
- Si B > nouvelle durée, ajuster B = nouvelle durée
- Conserver le ratio A/B si possible

**Code suggéré** :
```typescript
// tone-engine.service.ts
private adjustLoopPoints(newDuration: number): void {
  const start = this.loopStart();
  const end = this.loopEnd();

  if (start !== null && start > newDuration) {
    this.loopStart.set(newDuration);
  }

  if (end !== null && end > newDuration) {
    this.loopEnd.set(newDuration);
  }
}
```

#### Volume Control
**Impact** : Aucun. Le volume est indépendant du buffer audio.

#### Speed Control
**Impact** : Aucun. La vitesse est gérée par Tone.js Player, indépendamment du buffer.

## 5. Spécifications techniques

### 5.1 RubberbandEngineService

**Fichier** : `src/app/features/audio-looper/services/rubberband-engine.service.ts`

**Responsabilités** :
- Orchestrer le traitement audio via Web Worker
- Gérer le cache des buffers traités
- Débouncer les demandes de traitement (500ms)
- Exposer des signals pour l'état (progress, status, isProcessing)

**API publique** :
```typescript
@Injectable({ providedIn: 'root' })
export class RubberbandEngineService {
  // Signals
  readonly pitch = signal<number>(0);              // -6 à +6
  readonly playbackRate = signal<number>(1.0);     // 0.5x, 0.75x, 1.0x
  readonly isProcessing = signal<boolean>(false);
  readonly processingProgress = signal<number>(0); // 0-100
  readonly processingStatus = signal<string>('');  // "Analyzing...", "Processing..."

  // API
  loadOriginalBuffer(buffer: AudioBuffer): void;
  setPitch(semitones: number): void;
  setPlaybackRate(rate: number): void;
  getProcessedBuffer(): Observable<AudioBuffer>;
  clearCache(): void;
}
```

**Cache** :
```typescript
private readonly bufferCache = new Map<string, AudioBuffer>();

private getCacheKey(pitch: number, tempo: number): string {
  return `pitch_${pitch.toFixed(2)}_tempo_${tempo.toFixed(2)}`;
}
```

**Debounce** :
```typescript
private debounceTimer: number | null = null;
private readonly DEBOUNCE_DELAY = 500; // ms

private scheduleProcessing(): void {
  if (this.debounceTimer !== null) {
    clearTimeout(this.debounceTimer);
  }

  this.debounceTimer = setTimeout(() => {
    this.processAudio();
  }, this.DEBOUNCE_DELAY);
}
```

### 5.2 Web Worker

**Fichier** : `src/app/features/audio-looper/services/workers/rubberband.worker.ts`

**Chargement de rubberband-wasm** :
```typescript
importScripts('/assets/rubberband/rubberband.umd.min.js');

const RubberBandModule = (self as any).RubberBand;

// Initialisation asynchrone
const rubberband = await RubberBandModule({
  locateFile: (file: string) => {
    if (file.endsWith('.wasm')) {
      return '/assets/rubberband/rubberband.wasm';
    }
    return file;
  }
});

self.postMessage({ ready: true });
```

**Message d'entrée** (défini dans `rubberband-worker.types.ts`) :
```typescript
export interface RubberbandWorkerInput {
  channelBuffers: Float32Array[];  // Données audio par canal (mono ou stéréo)
  sampleRate: number;               // Ex: 44100, 48000
  pitch: number;                    // Facteur de pitch (ex: 1.0594631 pour +1 demi-ton)
  tempo: number;                    // Facteur de tempo (ex: 2.0 pour 0.5x vitesse)
}
```

**Messages de sortie** :
```typescript
export interface RubberbandWorkerOutput {
  channelBuffers?: Float32Array[]; // Résultat traité
  ready?: boolean;                 // Worker initialisé
  status?: string;                 // "Analyzing...", "Processing..."
  progress?: number;               // 0-1 (converti en 0-100% dans le service)
  error?: string;                  // Message d'erreur
}
```

**Traitement audio** (inspiré de `.ai/rubberband-wasm/worker.js`) :
```typescript
onmessage = async (e: MessageEvent<RubberbandWorkerInput>) => {
  const { channelBuffers, sampleRate, pitch, tempo } = e.data;

  // 1. Créer le stretcher
  const stretcher = new rubberband.RubberBandStretcher(
    sampleRate,
    channelBuffers.length,
    rubberband.OptionProcessRealTime | rubberband.OptionStretchPrecise,
    pitch,
    tempo
  );

  // 2. Estimer la durée de sortie
  const outputSamples = Math.ceil(channelBuffers[0].length * tempo);
  const outputBuffers = channelBuffers.map(() => new Float32Array(outputSamples));

  // 3. Phase Study (0-50%)
  postMessage({ status: 'Analyzing audio...', progress: 0 });
  stretcher.setExpectedInputDuration(channelBuffers[0].length);

  let samplesProcessed = 0;
  const totalSamples = channelBuffers[0].length;
  const blockSize = stretcher.getSamplesRequired();

  for (let i = 0; i < totalSamples; i += blockSize) {
    const remaining = totalSamples - i;
    const currentBlockSize = Math.min(blockSize, remaining);
    const isFinalBlock = (i + currentBlockSize >= totalSamples);

    stretcher.study(inputPtrs, currentBlockSize, isFinalBlock);

    // Progress throttling (250ms)
    const studyProgress = (i / totalSamples) * 0.5;
    reportProgressThrottled(studyProgress);
  }

  // 4. Phase Process (50-100%)
  postMessage({ status: 'Processing audio...', progress: 0.5 });
  samplesProcessed = 0;
  let outputWrite = 0;

  while (samplesProcessed < totalSamples || stretcher.available() > 0) {
    if (samplesProcessed < totalSamples) {
      const remaining = totalSamples - samplesProcessed;
      const currentBlockSize = Math.min(blockSize, remaining);
      const isFinalBlock = (samplesProcessed + currentBlockSize >= totalSamples);

      stretcher.process(inputPtrs, currentBlockSize, isFinalBlock);
      samplesProcessed += currentBlockSize;
    }

    const available = stretcher.available();
    if (available > 0) {
      const retrieved = stretcher.retrieve(outputPtrs, available);
      // Copier les données dans outputBuffers
      outputWrite += retrieved;
    }

    const processProgress = 0.5 + (samplesProcessed / totalSamples) * 0.5;
    reportProgressThrottled(processProgress);
  }

  // 5. Retourner le résultat
  postMessage({
    channelBuffers: outputBuffers,
    progress: 1.0
  });
};
```

**Progress throttling** :
```typescript
let lastProgressTime = 0;
const PROGRESS_THROTTLE = 250; // ms

function reportProgressThrottled(progress: number): void {
  const now = Date.now();
  if (now - lastProgressTime > PROGRESS_THROTTLE) {
    self.postMessage({ progress });
    lastProgressTime = now;
  }
}
```

### 5.3 ToneEngineService - Modifications

**Ajouts** :
```typescript
@Injectable({ providedIn: 'root' })
export class ToneEngineService {
  private readonly rubberbandEngine = inject(RubberbandEngineService);

  // Stockage du buffer original pour rubberband
  private originalAudioBuffer: AudioBuffer | null = null;

  // Souscription aux buffers traités
  private processedBufferSubscription?: Subscription;

  async loadAudioFile(file: File): Promise<void> {
    // ... code existant ...

    // Stocker le buffer original
    this.originalAudioBuffer = this.player.buffer.get();

    // Envoyer au rubberband engine
    this.rubberbandEngine.loadOriginalBuffer(this.originalAudioBuffer);

    // Écouter les buffers traités
    this.processedBufferSubscription = this.rubberbandEngine
      .getProcessedBuffer()
      .subscribe((processedBuffer) => {
        this.replaceAudioBuffer(processedBuffer);
      });
  }

  setPitch(semitones: number): void {
    // ... code existant (Tone.js PitchShift pour preview immédiat) ...

    // Déclencher le traitement rubberband (avec debounce)
    this.rubberbandEngine.setPitch(semitones);
  }

  private replaceAudioBuffer(newBuffer: AudioBuffer): void {
    if (!this.player) return;

    const currentPosition = this.currentTime();
    const wasPlaying = this.isPlaying();

    if (wasPlaying) {
      this.pause();
    }

    // Remplacer le buffer
    this.player.buffer.set(newBuffer);
    this.duration.set(newBuffer.duration);

    // Ajuster les loop points si nécessaire
    this.adjustLoopPoints(newBuffer.duration);

    // Restaurer la position et l'état
    if (wasPlaying) {
      this.seekTo(currentPosition);
      this.play();
    } else {
      this.seekTo(currentPosition);
    }
  }

  private adjustLoopPoints(newDuration: number): void {
    const start = this.loopStart();
    const end = this.loopEnd();

    if (start !== null && start > newDuration) {
      this.loopStart.set(newDuration);
    }

    if (end !== null && end > newDuration) {
      this.loopEnd.set(newDuration);
    }
  }

  dispose(): void {
    // ... code existant ...

    this.processedBufferSubscription?.unsubscribe();
    this.originalAudioBuffer = null;
  }
}
```

### 5.4 PitchControlComponent - Modifications

**Template HTML** (ajout de l'indicateur de progression) :
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

  <!-- Indicateur de progression (si traitement en cours) -->
  @if (rubberbandEngine.isProcessing()) {
    <div class="pitch-control__processing">
      <div class="pitch-control__processing-status">
        <span class="pitch-control__processing-icon">⏳</span>
        <span class="pitch-control__processing-text">
          {{ rubberbandEngine.processingStatus() }}
        </span>
        <span class="pitch-control__processing-percent">
          {{ rubberbandEngine.processingProgress() }}%
        </span>
      </div>
      <div class="pitch-control__progress-bar">
        <div
          class="pitch-control__progress-fill"
          [style.width.%]="rubberbandEngine.processingProgress()"
        ></div>
      </div>
    </div>
  }
</div>
```

**Component TypeScript** :
```typescript
export class PitchControlComponent {
  readonly toneEngine = inject(ToneEngineService);
  readonly rubberbandEngine = inject(RubberbandEngineService);

  onPitchChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.toneEngine.setPitch(value);
  }
}
```

### 5.5 WaveformDisplayComponent - Modifications

**Régénération de la waveform lors du changement de buffer** :
```typescript
export class WaveformDisplayComponent {
  readonly toneEngine = inject(ToneEngineService);

  constructor() {
    // Écouter les changements de buffer
    effect(() => {
      const duration = this.toneEngine.duration();
      if (duration > 0 && this.player) {
        this.regenerateWaveform();
      }
    });
  }

  private regenerateWaveform(): void {
    if (!this.player) return;

    const buffer = this.player.buffer.get();
    const channelData = buffer.getChannelData(0);

    // Regénérer la waveform dans le canvas
    this.drawWaveform(channelData);
  }
}
```

### 5.6 Configuration Angular

**angular.json** - Assets statiques :
```json
{
  "projects": {
    "app-youtube-looper": {
      "architect": {
        "build": {
          "options": {
            "assets": [
              {
                "glob": "**/*",
                "input": "public",
                "output": "/"
              }
            ]
          }
        }
      }
    }
  }
}
```

Les fichiers dans `public/assets/rubberband/` seront automatiquement copiés vers `dist/assets/rubberband/`.

**Web Worker** - Détection automatique :
Angular détecte automatiquement les fichiers `*.worker.ts` et les bundle séparément (lazy loading).

## 6. Formules mathématiques

### 6.1 Pitch Scale (Conversion demi-tons → pitch scale)

**Formule** :
```
pitchScale = 2^(semitones / 12)
```

**Implémentation** :
```typescript
function semitonesToPitchScale(semitones: number): number {
  return Math.pow(2, semitones / 12);
}
```

**Exemples** :
| Demi-tons | Pitch Scale | Pourcentage |
|-----------|-------------|-------------|
| -6        | 0.707107    | ~70.7%      |
| -3        | 0.840896    | ~84.1%      |
| 0         | 1.000000    | 100%        |
| +3        | 1.189207    | ~118.9%     |
| +6        | 1.414214    | ~141.4%     |

### 6.2 Tempo Factor (Conversion playback rate → tempo)

**Formule** :
```
tempo = 1 / playbackRate
```

**Implémentation** :
```typescript
function playbackRateToTempo(rate: number): number {
  return 1 / rate;
}
```

**Exemples** :
| Playback Rate | Tempo | Effet          |
|---------------|-------|----------------|
| 0.5x          | 2.0   | Audio 2x long  |
| 0.75x         | 1.333 | Audio 33% long |
| 1.0x          | 1.0   | Normal         |

**Note** : Dans Rubberband, le tempo représente le facteur d'étirement temporel, pas la vitesse de lecture.

## 7. Critères d'acceptation

### 7.1 Infrastructure

- ✅ Les fichiers `rubberband.wasm` et `rubberband.umd.min.js` sont copiés dans `public/assets/rubberband/`
- ✅ Les fichiers sont accessibles à l'URL `/assets/rubberband/` après build
- ✅ Le Web Worker est créé et compilé par Angular
- ✅ Le Worker charge correctement rubberband-wasm au démarrage

### 7.2 RubberbandEngineService

- ✅ Le service s'initialise correctement (injectable)
- ✅ Méthode `loadOriginalBuffer()` stocke le buffer audio original
- ✅ Méthode `setPitch()` déclenche le traitement avec debounce 500ms
- ✅ Le cache fonctionne (même pitch/tempo → pas de retraitement)
- ✅ Les signals `isProcessing`, `processingProgress`, `processingStatus` se mettent à jour
- ✅ Le traitement peut être annulé si le pitch change pendant le processing

### 7.3 Web Worker

- ✅ Le Worker se charge et envoie `{ ready: true }`
- ✅ Le Worker reçoit les messages avec `channelBuffers`, `sampleRate`, `pitch`, `tempo`
- ✅ Phase Study fonctionne (progress 0-50%)
- ✅ Phase Process fonctionne (progress 50-100%)
- ✅ Les messages de progression sont throttlés (250ms)
- ✅ Le Worker retourne un `AudioBuffer` valide avec le pitch modifié
- ✅ La qualité audio est professionnelle (pas d'artefacts audibles)

### 7.4 ToneEngineService - Intégration

- ✅ `ToneEngineService` injecte `RubberbandEngineService`
- ✅ Lors du chargement d'un fichier, le buffer original est envoyé à rubberband
- ✅ `setPitch()` met à jour Tone.js ET déclenche rubberband
- ✅ Quand le buffer traité arrive, il remplace le buffer actuel
- ✅ La position de lecture est conservée lors du remplacement
- ✅ L'état (playing/paused) est conservé lors du remplacement
- ✅ Les marqueurs A/B sont conservés (ajustés si nécessaire)

### 7.5 PitchControlComponent - UI

- ✅ Le slider -6 à +6 fonctionne
- ✅ La valeur courante s'affiche (ex: "+3 semitones")
- ✅ Le bouton "Reset Pitch" fonctionne
- ✅ Pendant le traitement, un indicateur de progression s'affiche
- ✅ L'indicateur affiche le statut ("Analyzing...", "Processing...")
- ✅ L'indicateur affiche le pourcentage (0-100%)
- ✅ L'indicateur disparaît quand le traitement est terminé

### 7.6 WaveformDisplayComponent - Régénération

- ✅ La waveform se régénère quand le buffer change
- ✅ Le curseur de lecture est conservé
- ✅ Les marqueurs A/B sont conservés
- ✅ La régénération est fluide (pas de freeze UI)

### 7.7 AudioPlayerComponent - Continuité

- ✅ La lecture continue pendant le traitement (si elle était en cours)
- ✅ Quand le buffer est remplacé, la lecture reprend à la même position
- ✅ Aucune coupure audible lors du remplacement
- ✅ Les contrôles (play/pause/seek) restent fonctionnels pendant le traitement

### 7.8 Qualité audio

- ✅ Changement de pitch de -6 à +6 demi-tons sans artefacts audibles
- ✅ Qualité audio supérieure à Tone.js PitchShift
- ✅ Aucun effet "chipmunk" ou "robot"
- ✅ Aucune distorsion ou phasing

### 7.9 Performances

- ✅ Le traitement prend moins de 5 secondes pour un fichier de 10 MB (sur machine moyenne)
- ✅ L'UI reste responsive pendant le traitement (pas de freeze)
- ✅ Le cache fonctionne (retour instantané aux valeurs déjà traitées)
- ✅ Le debounce 500ms évite les traitements inutiles

### 7.10 Gestion des erreurs

- ✅ Si le Worker ne se charge pas, afficher un message d'erreur
- ✅ Si le traitement échoue, afficher un message d'erreur et revenir à Tone.js
- ✅ Si l'utilisateur ferme la page pendant le traitement, le Worker est terminé proprement

## 8. Contraintes et limites

### 8.1 Contraintes techniques

- **Taille des assets** : rubberband.wasm (265 KB) + rubberband.umd.min.js (6.7 KB)
- **Temps de traitement** : ~2-5 secondes pour 10 MB (varie selon la machine)
- **Mémoire** : Le Worker peut nécessiter jusqu'à 3x la taille du fichier en RAM
- **Compatibilité** : Nécessite WebAssembly (tous les navigateurs modernes)

### 8.2 Limites fonctionnelles

- **Plage de pitch** : -6 à +6 demi-tons (contrainte du PRD audio-looper)
- **Fichiers lourds** : Au-delà de 10 MB, le traitement peut prendre >10 secondes
- **Multitâche** : Un seul traitement à la fois (les demandes sont débounced)

### 8.3 Hors périmètre (version 1)

- Export du fichier traité (WAV)
- Contrôle du tempo via rubberband (utilise Tone.js)
- Stratégie hybride (Tone.js preview + rubberband)
- Streaming audio par chunks
- Préchargement des buffers (valeurs ±1, ±2, etc.)

## 9. Tests manuels

### 9.1 Test de base

1. Lancer l'application : `npm start`
2. Aller sur l'onglet "Audio Looper"
3. Uploader un fichier MP3 (ex: `test-song.mp3`)
4. Attendre le chargement
5. Cliquer sur Play → Écouter l'audio normal
6. Déplacer le slider Pitch à +3
7. Attendre la fin du traitement (~2-3 secondes)
8. Écouter l'audio avec pitch +3 → Qualité audio professionnelle

### 9.2 Test du cache

1. Déplacer le slider à +5 (traitement ~3 secondes)
2. Déplacer le slider à +3 (traitement instantané, cache hit)
3. Déplacer le slider à +5 (traitement instantané, cache hit)

### 9.3 Test de la continuité de lecture

1. Lancer la lecture d'un fichier
2. Pendant la lecture, changer le pitch à -3
3. Vérifier que la lecture continue sans interruption
4. Attendre la fin du traitement
5. Vérifier que la lecture se poursuit avec le nouveau pitch

### 9.4 Test des marqueurs A/B

1. Définir des marqueurs A (10s) et B (20s)
2. Activer la boucle
3. Changer le pitch à +6
4. Vérifier que les marqueurs A/B restent visibles
5. Vérifier que la boucle fonctionne après le traitement

### 9.5 Test de build

1. Lancer `npm run build`
2. Vérifier qu'il n'y a pas d'erreurs TypeScript
3. Vérifier que les fichiers sont dans `dist/assets/rubberband/`
4. Vérifier que le Worker est bundlé séparément

## 10. Documentation technique

### 10.1 Références

- **Rubberband Library** : https://breakfastquay.com/rubberband/
- **Rubberband WASM GitHub** : https://github.com/Daninet/rubberband-wasm
- **Tone.js PitchShift** : https://tonejs.github.io/docs/PitchShift
- **Angular Web Workers** : https://angular.dev/ecosystem/web-workers

### 10.2 Ressources existantes

- **Démo fonctionnelle** : `.ai/rubberband-wasm/index.html`
- **PRD audio-looper** : `.taskmaster/docs/PRD-audio-uploader.md`
- **PRD rubberband-wasm** : `.ai/rubberband-wasm/PRD-Rubberband-wasm.md`

## 11. Découpage en tâches suggéré

### Tâche 1 : Préparation des assets
- Copier `rubberband.wasm` et `rubberband.umd.min.js` dans `public/assets/rubberband/`
- Vérifier que les fichiers sont accessibles après build
- Créer la structure de dossiers pour le Worker

### Tâche 2 : Création du Web Worker
- Créer `rubberband-worker.types.ts` (interfaces)
- Créer `rubberband.worker.ts` (logique du Worker)
- Implémenter le chargement de rubberband-wasm
- Implémenter les phases Study et Process
- Tester le Worker isolément (console logs)

### Tâche 3 : Création du RubberbandEngineService
- Créer le service avec les signals
- Implémenter le cache des buffers
- Implémenter le debounce 500ms
- Implémenter la communication avec le Worker
- Tester le service isolément

### Tâche 4 : Intégration dans ToneEngineService
- Injecter `RubberbandEngineService`
- Stocker le buffer original
- Implémenter `replaceAudioBuffer()`
- Implémenter `adjustLoopPoints()`
- Tester le remplacement de buffer

### Tâche 5 : UI - Indicateur de progression
- Modifier `pitch-control.component.html` (ajouter l'indicateur)
- Modifier `pitch-control.component.scss` (styles de l'indicateur)
- Modifier `pitch-control.component.ts` (injecter RubberbandEngine)
- Tester l'affichage de l'indicateur

### Tâche 6 : Régénération de la waveform
- Modifier `WaveformDisplayComponent`
- Implémenter `regenerateWaveform()` avec `effect()`
- Tester la régénération

### Tâche 7 : Tests manuels et corrections
- Tests de base (pitch -6 à +6)
- Tests du cache
- Tests de continuité de lecture
- Tests des marqueurs A/B
- Corrections des bugs trouvés

### Tâche 8 : Polish et optimisations
- Améliorer le feedback visuel
- Optimiser les performances si nécessaire
- Documentation du code
- Validation finale

## 12. Décisions d'implémentation validées

### Décision 1 : Comportement pendant le traitement
**✅ Approche retenue : Continuer la lecture avec l'ancien buffer**

Pendant que rubberband traite l'audio en arrière-plan :
- La lecture continue normalement avec le buffer actuel
- L'utilisateur n'est pas interrompu
- Une barre de progression visible informe du traitement en cours
- Quand le traitement est terminé, le buffer est remplacé à la volée

**Justification** : Meilleure expérience utilisateur, pas d'interruption de l'écoute.

### Décision 2 : Stratégie de remplacement de buffer
**✅ Approche retenue : Remplacement immédiat après le traitement**

Dès que le traitement rubberband est terminé :
- Le buffer est remplacé immédiatement
- La position de lecture actuelle est préservée
- L'état (playing/paused) est restauré
- Micro-interruption acceptable (<100ms)

**Justification** : Feedback immédiat de la qualité audio améliorée.

### Décision 3 : Gestion de la waveform
**✅ Approche retenue : Régénération automatique après chaque traitement**

Après remplacement du buffer :
- La waveform est automatiquement régénérée
- Les marqueurs A/B sont conservés (positions en secondes)
- Le curseur de lecture est conservé
- Transition visuelle fluide

**Justification** : Cohérence visuelle entre l'audio et son affichage graphique.

### Décision 4 : Export audio
**✅ Approche retenue : Hors périmètre Version 1**

L'export du fichier audio traité (WAV) n'est pas inclus dans cette version :
- Simplifie l'implémentation initiale
- Focus sur la fonctionnalité principale (pitch shift)
- Pourra être ajouté dans une version future

**Justification** : Simplifier la V1 et valider d'abord le core feature.

### Décision 5 : Fallback en cas d'échec
**✅ Approche retenue : Afficher une erreur mais garder Tone.js actif**

Si le traitement rubberband échoue :
- Un message d'erreur clair est affiché à l'utilisateur
- Tone.js PitchShift reste actif (qualité moyenne mais fonctionnel)
- L'utilisateur peut continuer à utiliser l'application
- Un bouton "Réessayer" peut être proposé

**Justification** : Meilleure UX, l'application reste utilisable même en cas de problème.

---

**Document créé le** : 2025-10-14
**Auteur** : Claude Code
**Version** : 1.0
**Status** : ✅ Validé - Prêt pour TaskMaster AI

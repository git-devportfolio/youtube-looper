import { Injectable, signal, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { RubberbandWorkerInput, RubberbandWorkerOutput } from './workers/rubberband-worker.types';
import { BrowserCompatibilityService } from './compatibility';

/**
 * Service Angular orchestrant le traitement audio via le Web Worker Rubberband
 *
 * Fonctionnalités principales :
 * - Gestion du Web Worker pour le pitch shifting et time stretching
 * - Cache intelligent des buffers traités
 * - Debounce des modifications de paramètres
 * - Signals réactifs pour l'état du traitement
 */
@Injectable({
  providedIn: 'root'
})
export class RubberbandEngineService {
  // ==================== SERVICES ====================

  /**
   * Service de détection de compatibilité navigateur
   */
  private readonly compatibilityService = inject(BrowserCompatibilityService);

  // ==================== SIGNALS D'ÉTAT ====================

  /**
   * Signal pour la modification de tonalité en demi-tons
   * Plage : -6 à +6 demi-tons (défaut : 0 = pas de modification)
   */
  readonly pitch = signal<number>(0);

  /**
   * Signal pour la vitesse de lecture
   * Valeurs supportées : 0.5x, 0.75x, 1.0x (défaut : 1.0 = vitesse normale)
   */
  readonly playbackRate = signal<number>(1.0);

  /**
   * Signal indiquant si un traitement audio est en cours
   */
  readonly isProcessing = signal<boolean>(false);

  /**
   * Signal pour la progression du traitement audio
   * Plage : 0 à 100 (pourcentage)
   */
  readonly processingProgress = signal<number>(0);

  /**
   * Signal pour le statut textuel du traitement
   * Exemples : 'Studying...', 'Processing...', 'Complete', ''
   */
  readonly processingStatus = signal<string>('');

  /**
   * Signal pour indiquer si une erreur est survenue
   */
  readonly hasError = signal<boolean>(false);

  /**
   * Signal pour le message d'erreur détaillé
   */
  readonly errorMessage = signal<string>('');

  // ==================== CACHE ====================

  /**
   * Cache des AudioBuffer traités
   * Clé : combinaison pitch-tempo (ex: 'p2_t0.75')
   * Valeur : AudioBuffer traité
   */
  private audioCache = new Map<string, AudioBuffer>();

  /**
   * Buffer audio original (non traité)
   */
  private originalBuffer: AudioBuffer | null = null;

  /**
   * Web Worker Rubberband pour le traitement audio
   */
  private worker: Worker | null = null;

  /**
   * Flag indiquant si le worker est prêt à traiter l'audio
   */
  private workerReady = false;

  /**
   * File d'attente des traitements en attente que le worker soit prêt
   */
  private pendingProcessing = false;

  /**
   * Timer pour le debounce des modifications de paramètres
   */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Délai de debounce en millisecondes
   */
  private readonly DEBOUNCE_DELAY = 500;

  /**
   * Timer pour le throttling des messages de progression
   */
  private progressThrottleTimer: number = 0;

  /**
   * Délai de throttling pour les messages de progression (ms)
   */
  private readonly PROGRESS_THROTTLE_DELAY = 250;

  /**
   * Timeout pour le traitement audio (ms) - 60 secondes
   */
  private readonly PROCESSING_TIMEOUT = 60000;

  /**
   * Timer pour le timeout du traitement
   */
  private processingTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Subject pour émettre les AudioBuffer traités
   */
  private processedBufferSubject = new Subject<AudioBuffer>();

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * Génère une clé de cache unique basée sur pitch et tempo
   * @param pitch Modification de tonalité en demi-tons
   * @param tempo Vitesse de lecture (playbackRate)
   * @returns Clé de cache unique (ex: 'p2_t0.75')
   */
  private getCacheKey(pitch: number, tempo: number): string {
    return `p${pitch}_t${tempo}`;
  }

  /**
   * Vérifie si un AudioBuffer existe dans le cache
   * @param pitch Modification de tonalité en demi-tons
   * @param tempo Vitesse de lecture (playbackRate)
   * @returns true si le buffer est dans le cache
   */
  private hasCache(pitch: number, tempo: number): boolean {
    const key = this.getCacheKey(pitch, tempo);
    return this.audioCache.has(key);
  }

  /**
   * Récupère un AudioBuffer depuis le cache
   * @param pitch Modification de tonalité en demi-tons
   * @param tempo Vitesse de lecture (playbackRate)
   * @returns AudioBuffer traité ou undefined si non trouvé
   */
  private getFromCache(pitch: number, tempo: number): AudioBuffer | undefined {
    const key = this.getCacheKey(pitch, tempo);
    return this.audioCache.get(key);
  }

  /**
   * Stocke un AudioBuffer dans le cache
   * @param pitch Modification de tonalité en demi-tons
   * @param tempo Vitesse de lecture (playbackRate)
   * @param buffer AudioBuffer à mettre en cache
   */
  private setCache(pitch: number, tempo: number, buffer: AudioBuffer): void {
    const key = this.getCacheKey(pitch, tempo);
    this.audioCache.set(key, buffer);
  }

  // ==================== API PUBLIQUE ====================

  /**
   * Crée et initialise le Web Worker Rubberband
   */
  private createWorker(): void {
    if (this.worker) {
      return; // Worker déjà créé
    }

    // Vérifier la compatibilité du navigateur
    const compat = this.compatibilityService.compatibility();
    if (compat && !compat.isFullyCompatible) {
      const message = this.compatibilityService.getIncompatibilityMessage();
      this.handleProcessingError(message || 'Browser compatibility issues detected');
      return;
    }

    // Créer le Worker
    this.worker = new Worker(
      new URL('./workers/rubberband.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Gérer les messages du Worker
    this.worker.onmessage = (event: MessageEvent<RubberbandWorkerOutput>) => {
      const data = event.data;

      // Worker prêt
      if (data.ready) {
        console.log('[RubberbandEngineService] Worker ready');
        this.workerReady = true;

        // Si un traitement était en attente, le lancer maintenant
        if (this.pendingProcessing) {
          this.pendingProcessing = false;
          this.processAudio();
        }
        return;
      }

      // Progression du traitement (avec throttling pour optimiser les performances)
      if (data.progress !== undefined) {
        this.updateProgressThrottled(data.progress);
      }

      // Statut du traitement
      if (data.status) {
        this.processingStatus.set(data.status);
      }

      // Erreur de traitement
      if (data.error) {
        console.error('[RubberbandEngineService] Worker error:', data.error);
        this.handleProcessingError(data.error);
        return;
      }

      // Résultat du traitement
      if (data.channelBuffers) {
        this.handleProcessedAudio(data.channelBuffers);
      }
    };

    // Gérer les erreurs du Worker
    this.worker.onerror = (error: ErrorEvent) => {
      console.error('[RubberbandEngineService] Worker error:', error);
      this.handleProcessingError(error.message || 'Unknown worker error');
    };
  }

  /**
   * Détruit le Web Worker
   */
  private destroyWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerReady = false;
      this.pendingProcessing = false;
    }
  }

  /**
   * Gère les erreurs de traitement audio
   * @param errorMsg Message d'erreur
   */
  private handleProcessingError(errorMsg: string): void {
    // Annuler le timeout
    this.clearProcessingTimeout();

    // Mettre à jour les signals d'état
    this.isProcessing.set(false);
    this.processingStatus.set('Error');
    this.hasError.set(true);
    this.errorMessage.set(errorMsg);
    this.processingProgress.set(0);

    console.error('[RubberbandEngineService] Processing error:', errorMsg);
  }

  /**
   * Démarre le timer de timeout pour le traitement
   */
  private startProcessingTimeout(): void {
    this.clearProcessingTimeout();

    this.processingTimeoutTimer = setTimeout(() => {
      console.error('[RubberbandEngineService] Processing timeout after', this.PROCESSING_TIMEOUT, 'ms');
      this.handleProcessingError('Processing timeout: audio processing took too long');
      this.destroyWorker();
    }, this.PROCESSING_TIMEOUT);
  }

  /**
   * Annule le timer de timeout
   */
  private clearProcessingTimeout(): void {
    if (this.processingTimeoutTimer !== null) {
      clearTimeout(this.processingTimeoutTimer);
      this.processingTimeoutTimer = null;
    }
  }

  /**
   * Gère l'audio traité reçu du Worker
   * @param channelBuffers Tableaux de canaux audio traités
   */
  private handleProcessedAudio(channelBuffers: Float32Array[]): void {
    // Annuler le timeout car le traitement est terminé
    this.clearProcessingTimeout();

    if (!this.originalBuffer) {
      console.error('[RubberbandEngineService] No original buffer');
      this.handleProcessingError('No original buffer available');
      return;
    }

    // Créer un AudioBuffer à partir des canaux traités
    const audioContext = new AudioContext();
    const processedBuffer = audioContext.createBuffer(
      channelBuffers.length,
      channelBuffers[0].length,
      this.originalBuffer.sampleRate
    );

    // Copier les données dans l'AudioBuffer
    for (let channel = 0; channel < channelBuffers.length; channel++) {
      // Créer une copie avec ArrayBuffer standard (pas SharedArrayBuffer) 
      const channelData = new Float32Array(channelBuffers[channel]);
      processedBuffer.copyToChannel(channelData, channel);
    }

    // Mettre en cache
    const currentPitch = this.pitch();
    const currentTempo = this.playbackRate();
    this.setCache(currentPitch, currentTempo, processedBuffer);

    // Émettre le buffer traité
    this.processedBufferSubject.next(processedBuffer);

    // Réinitialiser l'état
    this.isProcessing.set(false);
    this.processingStatus.set('Complete');
    this.processingProgress.set(100);
  }

  /**
   * Met à jour la progression avec throttling (250ms)
   * Évite les mises à jour trop fréquentes qui peuvent dégrader les performances
   * @param progress Progression du traitement (0-100)
   */
  private updateProgressThrottled(progress: number): void {
    const now = Date.now();

    // Mettre à jour immédiatement si :
    // - Premier message (progressThrottleTimer === 0)
    // - Traitement terminé (progress === 100)
    // - Délai de throttling écoulé
    if (
      this.progressThrottleTimer === 0 ||
      progress === 100 ||
      now - this.progressThrottleTimer >= this.PROGRESS_THROTTLE_DELAY
    ) {
      this.processingProgress.set(progress);
      this.progressThrottleTimer = now;
    }
  }

  /**
   * Annule le traitement en cours en détruisant le worker
   * Utile pour éviter de traiter des paramètres obsolètes
   */
  private cancelCurrentProcessing(): void {
    if (this.worker && this.isProcessing()) {
      console.log('[RubberbandEngineService] Cancelling current processing');
      this.destroyWorker();
      this.isProcessing.set(false);
      this.processingStatus.set('Cancelled');
      this.processingProgress.set(0);
      this.progressThrottleTimer = 0;
    }
  }

  /**
   * Déclenche le traitement audio avec debounce
   */
  private triggerProcessing(): void {
    // Annuler le timer existant
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    // Annuler le traitement en cours si les paramètres changent
    this.cancelCurrentProcessing();

    // Créer un nouveau timer
    this.debounceTimer = setTimeout(() => {
      this.processAudio();
      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Lance le traitement audio via le Worker
   */
  private processAudio(): void {
    if (!this.originalBuffer) {
      console.warn('[RubberbandEngineService] No audio loaded');
      return;
    }

    const currentPitch = this.pitch();
    const currentTempo = this.playbackRate();

    // Vérifier le cache
    if (this.hasCache(currentPitch, currentTempo)) {
      const cachedBuffer = this.getFromCache(currentPitch, currentTempo);
      if (cachedBuffer) {
        console.log('[RubberbandEngineService] Using cached buffer');
        this.processedBufferSubject.next(cachedBuffer);
        return;
      }
    }

    // Créer le Worker si nécessaire
    this.createWorker();

    if (!this.worker) {
      console.error('[RubberbandEngineService] Worker not available');
      return;
    }

    // Si le worker n'est pas encore prêt, marquer le traitement comme en attente
    if (!this.workerReady) {
      console.log('[RubberbandEngineService] Worker not ready yet, queueing processing');
      this.pendingProcessing = true;
      this.processingStatus.set('Initializing worker...');
      return;
    }

    // Préparer les données pour le Worker
    const channelBuffers: Float32Array[] = [];
    for (let channel = 0; channel < this.originalBuffer.numberOfChannels; channel++) {
      const channelData = new Float32Array(this.originalBuffer.length);
      this.originalBuffer.copyFromChannel(channelData, channel);
      channelBuffers.push(channelData);
    }

    // Réinitialiser les erreurs précédentes
    this.hasError.set(false);
    this.errorMessage.set('');

    // Mettre à jour l'état
    this.isProcessing.set(true);
    this.processingProgress.set(0);
    this.processingStatus.set('Starting...');

    // Démarrer le timeout
    this.startProcessingTimeout();

    // Envoyer au Worker
    const workerInput: RubberbandWorkerInput = {
      channelBuffers,
      sampleRate: this.originalBuffer.sampleRate,
      pitch: currentPitch,
      tempo: currentTempo
    };

    this.worker.postMessage(workerInput);
  }

  // ==================== API PUBLIQUE ====================

  /**
   * Charge le buffer audio original à traiter
   * @param buffer AudioBuffer original (non traité)
   */
  loadOriginalBuffer(buffer: AudioBuffer): void {
    this.originalBuffer = buffer;

    // Mettre le buffer original en cache avec pitch=0 et tempo=1.0
    // Cela évite de retraiter l'audio quand on revient aux paramètres par défaut
    this.setCache(0, 1.0, buffer);

    console.log('[RubberbandEngineService] Original buffer loaded and cached', {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      cachedAs: this.getCacheKey(0, 1.0)
    });
  }

  /**
   * Définit la modification de tonalité en demi-tons
   * @param semitones Modification de tonalité (-6 à +6 demi-tons)
   */
  setPitch(semitones: number): void {
    // Valider la plage
    const clampedPitch = Math.max(-6, Math.min(6, semitones));

    if (clampedPitch !== this.pitch()) {
      this.pitch.set(clampedPitch);
      console.log('[RubberbandEngineService] Pitch set to', clampedPitch);
      this.triggerProcessing();
    }
  }

  /**
   * Définit la vitesse de lecture (playback rate)
   * @param rate Vitesse de lecture (0.25 à 2.0)
   */
  setPlaybackRate(rate: number): void {
    // Valider la plage raisonnable (0.25x à 2.0x)
    const clampedRate = Math.max(0.25, Math.min(2.0, rate));

    if (clampedRate !== this.playbackRate()) {
      this.playbackRate.set(clampedRate);
      console.log('[RubberbandEngineService] Playback rate set to', clampedRate);
      this.triggerProcessing();
    }
  }

  /**
   * Retourne un Observable émettant les AudioBuffer traités
   * @returns Observable d'AudioBuffer traités
   */
  getProcessedBuffer(): Observable<AudioBuffer> {
    return this.processedBufferSubject.asObservable();
  }

  /**
   * Vide complètement le cache des AudioBuffer traités
   */
  clearCache(): void {
    this.audioCache.clear();
    console.log('[RubberbandEngineService] Cache cleared');
  }

  /**
   * Retourne les informations de compatibilité du navigateur
   */
  getCompatibility() {
    return this.compatibilityService.compatibility();
  }

  /**
   * Nettoie le service (détruit le Worker et libère les ressources)
   */
  destroy(): void {
    this.destroyWorker();
    this.clearCache();
    this.clearProcessingTimeout();
    this.originalBuffer = null;
    this.processedBufferSubject.complete();

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Réinitialiser les timers et états
    this.progressThrottleTimer = 0;
    this.hasError.set(false);
    this.errorMessage.set('');

    console.log('[RubberbandEngineService] Service destroyed');
  }

  constructor() {}
}

import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { RubberbandWorkerInput, RubberbandWorkerOutput } from './workers/rubberband-worker.types';

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
   * Timer pour le debounce des modifications de paramètres
   */
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Délai de debounce en millisecondes
   */
  private readonly DEBOUNCE_DELAY = 500;

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
        return;
      }

      // Progression du traitement
      if (data.progress !== undefined) {
        this.processingProgress.set(data.progress);
      }

      // Statut du traitement
      if (data.status) {
        this.processingStatus.set(data.status);
      }

      // Erreur de traitement
      if (data.error) {
        console.error('[RubberbandEngineService] Worker error:', data.error);
        this.isProcessing.set(false);
        this.processingStatus.set('Error');
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
      this.isProcessing.set(false);
      this.processingStatus.set('Error');
    };
  }

  /**
   * Détruit le Web Worker
   */
  private destroyWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Gère l'audio traité reçu du Worker
   * @param channelBuffers Tableaux de canaux audio traités
   */
  private handleProcessedAudio(channelBuffers: Float32Array[]): void {
    if (!this.originalBuffer) {
      console.error('[RubberbandEngineService] No original buffer');
      this.isProcessing.set(false);
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
      processedBuffer.copyToChannel(channelBuffers[channel], channel);
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
   * Déclenche le traitement audio avec debounce
   */
  private triggerProcessing(): void {
    // Annuler le timer existant
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

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

    // Préparer les données pour le Worker
    const channelBuffers: Float32Array[] = [];
    for (let channel = 0; channel < this.originalBuffer.numberOfChannels; channel++) {
      const channelData = new Float32Array(this.originalBuffer.length);
      this.originalBuffer.copyFromChannel(channelData, channel);
      channelBuffers.push(channelData);
    }

    // Mettre à jour l'état
    this.isProcessing.set(true);
    this.processingProgress.set(0);
    this.processingStatus.set('Starting...');

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
    console.log('[RubberbandEngineService] Original buffer loaded', {
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels
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
   * @param rate Vitesse de lecture (0.5, 0.75, ou 1.0)
   */
  setPlaybackRate(rate: number): void {
    // Valider les valeurs supportées
    const validRates = [0.5, 0.75, 1.0];
    const closestRate = validRates.reduce((prev, curr) =>
      Math.abs(curr - rate) < Math.abs(prev - rate) ? curr : prev
    );

    if (closestRate !== this.playbackRate()) {
      this.playbackRate.set(closestRate);
      console.log('[RubberbandEngineService] Playback rate set to', closestRate);
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
   * Nettoie le service (détruit le Worker et libère les ressources)
   */
  destroy(): void {
    this.destroyWorker();
    this.clearCache();
    this.originalBuffer = null;
    this.processedBufferSubject.complete();

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    console.log('[RubberbandEngineService] Service destroyed');
  }

  constructor() {}
}

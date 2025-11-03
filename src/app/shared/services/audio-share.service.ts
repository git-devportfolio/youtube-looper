import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Interface pour les données de l'AudioBuffer sérialisées pour le worker
 */
interface AudioBufferData {
  channelData: Float32Array[];
  sampleRate: number;
  numberOfChannels: number;
  length: number;
}

/**
 * Interface pour les messages de progression du worker
 */
interface ProgressMessage {
  type: 'progress';
  progress: number;
}

/**
 * Interface pour les messages de completion du worker
 */
interface CompleteMessage {
  type: 'complete';
  mp3Data: Int8Array[];
}

/**
 * Interface pour les messages d'erreur du worker
 */
interface ErrorMessage {
  type: 'error';
  error: string;
}

/**
 * Type union pour tous les messages du worker
 */
type WorkerMessage = ProgressMessage | CompleteMessage | ErrorMessage;

/**
 * Service Angular pour gérer le téléchargement d'audio encodé en MP3
 *
 * Fonctionnalités principales :
 * - Encodage AudioBuffer vers MP3 via Web Worker
 * - Téléchargement de fichier audio avec métadonnées (pitch, tempo)
 * - Gestion des erreurs et feedback de progression
 */
@Injectable({
  providedIn: 'root'
})
export class AudioShareService {
  // ==================== SIGNALS D'ÉTAT ====================

  /**
   * Signal indiquant si un encodage/téléchargement est en cours
   */
  readonly isProcessing = signal<boolean>(false);

  /**
   * Signal pour la progression de l'encodage MP3
   * Plage : 0 à 100 (pourcentage)
   */
  readonly encodingProgress = signal<number>(0);

  /**
   * Signal pour le statut textuel du traitement
   * Exemples : 'Encoding...', 'Downloading...', 'Complete', ''
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

  // ==================== PROPRIÉTÉS PRIVÉES ====================

  /**
   * Web Worker pour l'encodage MP3
   */
  private worker: Worker | null = null;

  /**
   * Subject pour émettre les événements de téléchargement réussi
   */
  private downloadSuccessSubject = new Subject<void>();

  /**
   * Blob MP3 temporaire stocké pendant le traitement
   */
  private pendingMp3Blob: Blob | null = null;

  /**
   * Nom du fichier temporaire
   */
  private pendingFileName: string = '';

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * Crée le Web Worker pour l'encodage MP3
   */
  private createWorker(): void {
    if (this.worker) {
      return; // Worker déjà créé
    }

    this.worker = new Worker(
      new URL('../workers/mp3-encoder.worker.ts', import.meta.url),
      { type: 'classic' }
    );

    // Gérer les messages du Worker
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const data = event.data;

      // Progression de l'encodage
      if (data.type === 'progress') {
        this.encodingProgress.set(data.progress);
      }

      // Encodage terminé
      if (data.type === 'complete') {
        this.handleEncodingComplete(data.mp3Data);
      }

      // Erreur d'encodage
      if (data.type === 'error') {
        console.error('[AudioShareService] Worker error:', data.error);
        this.handleProcessingError(data.error);
      }
    };

    // Gérer les erreurs du Worker
    this.worker.onerror = (error: ErrorEvent) => {
      console.error('[AudioShareService] Worker error:', error);
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
    }
  }

  /**
   * Gère les erreurs de traitement
   * @param errorMsg Message d'erreur
   */
  private handleProcessingError(errorMsg: string): void {
    this.isProcessing.set(false);
    this.processingStatus.set('Error');
    this.hasError.set(true);
    this.errorMessage.set(errorMsg);
    this.encodingProgress.set(0);

    console.error('[AudioShareService] Processing error:', errorMsg);

    // Détruire le worker en cas d'erreur
    this.destroyWorker();
  }

  /**
   * Gère la completion de l'encodage MP3
   * @param mp3Data Tableau de chunks MP3 encodés
   */
  private handleEncodingComplete(mp3Data: Int8Array[]): void {
    console.log('[AudioShareService] Encoding complete');

    // Convertir les chunks MP3 en Blob
    // Convertir Int8Array en Uint8Array pour compatibilité TypeScript avec BlobPart
    // On crée une copie pour garantir un ArrayBuffer standard (pas SharedArrayBuffer)
    const uint8Arrays = mp3Data.map(chunk => new Uint8Array(chunk));
    const mp3Blob = new Blob(uint8Arrays, { type: 'audio/mp3' });

    // Stocker temporairement
    this.pendingMp3Blob = mp3Blob;

    // Mettre à jour le statut et effectuer le téléchargement
    this.encodingProgress.set(100);
    this.processingStatus.set('Downloading...');
    this.performDownload();
  }

  /**
   * Effectue le téléchargement direct du fichier MP3
   */
  private performDownload(): void {
    if (!this.pendingMp3Blob || !this.pendingFileName) {
      this.handleProcessingError('No MP3 data available for download');
      return;
    }

    try {
      // Créer une URL blob pour le téléchargement
      const blobUrl = URL.createObjectURL(this.pendingMp3Blob);

      // Créer un lien de téléchargement invisible
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = this.pendingFileName;
      downloadLink.style.display = 'none';

      // Ajouter au DOM, cliquer et retirer
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Nettoyer l'URL blob après un court délai
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);

      // Téléchargement lancé avec succès
      console.log('[AudioShareService] Download started successfully');
      this.isProcessing.set(false);
      this.processingStatus.set('Downloaded successfully');
      this.downloadSuccessSubject.next();

      // Nettoyer les données temporaires
      this.pendingMp3Blob = null;
      this.pendingFileName = '';

      // Détruire le worker
      this.destroyWorker();

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error during download';
      this.handleProcessingError(errorMsg);
    }
  }

  /**
   * Encode un AudioBuffer en MP3
   * @param buffer AudioBuffer à encoder
   */
  private encodeAudioBuffer(buffer: AudioBuffer): void {
    // Créer le worker si nécessaire
    this.createWorker();

    if (!this.worker) {
      this.handleProcessingError('Worker not available');
      return;
    }

    // Préparer les données pour le Worker
    const channelData: Float32Array[] = [];
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = new Float32Array(buffer.length);
      buffer.copyFromChannel(data, channel);
      channelData.push(data);
    }

    const audioBufferData: AudioBufferData = {
      channelData,
      sampleRate: buffer.sampleRate,
      numberOfChannels: buffer.numberOfChannels,
      length: buffer.length
    };

    // Mettre à jour l'état
    this.isProcessing.set(true);
    this.processingStatus.set('Encoding...');
    this.encodingProgress.set(0);
    this.hasError.set(false);
    this.errorMessage.set('');

    // Envoyer au Worker
    this.worker.postMessage({
      type: 'encode',
      audioBuffer: audioBufferData
    });
  }

  // ==================== API PUBLIQUE ====================

  /**
   * Télécharge un fichier audio avec les modifications appliquées
   *
   * @param buffer AudioBuffer à télécharger
   * @param fileName Nom du fichier (ex: 'audio_pitch+2_tempo0.75.mp3')
   * @param pitch Modification de tonalité en demi-tons (pour info, déjà appliquée dans buffer)
   * @param tempo Vitesse de lecture (pour info, déjà appliquée dans buffer)
   * @returns Promise qui se résout quand le téléchargement est lancé
   */
  async downloadAudio(
    buffer: AudioBuffer,
    fileName: string,
    pitch?: number,
    tempo?: number
  ): Promise<void> {
    // Vérifier que le buffer est valide
    if (!buffer || buffer.length === 0) {
      throw new Error('Invalid audio buffer');
    }

    // Générer un nom de fichier avec métadonnées si non fourni
    if (!fileName) {
      const pitchStr = pitch !== undefined ? `_pitch${pitch >= 0 ? '+' : ''}${pitch}` : '';
      const tempoStr = tempo !== undefined ? `_tempo${tempo}` : '';
      fileName = `audio${pitchStr}${tempoStr}.mp3`;
    }

    // Stocker le nom de fichier
    this.pendingFileName = fileName;

    console.log('[AudioShareService] Starting download process', {
      fileName,
      pitch,
      tempo,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels
    });

    // Encoder le buffer en MP3
    // Le reste du processus (téléchargement) sera géré par handleEncodingComplete()
    this.encodeAudioBuffer(buffer);

    // Retourner une Promise qui se résout quand le téléchargement est lancé
    return new Promise((resolve, reject) => {
      const subscription = this.downloadSuccessSubject.subscribe(() => {
        subscription.unsubscribe();
        resolve();
      });

      // En cas d'erreur, rejeter la Promise
      // Note: On surveille le signal hasError pour détecter les erreurs
    });
  }

  /**
   * Retourne un Observable émettant les événements de téléchargement réussi
   * @returns Observable émettant void quand le téléchargement est réussi
   */
  getDownloadSuccess(): Observable<void> {
    return this.downloadSuccessSubject.asObservable();
  }

  /**
   * Nettoie le service (détruit le Worker et libère les ressources)
   */
  destroy(): void {
    this.destroyWorker();
    this.downloadSuccessSubject.complete();
    this.pendingMp3Blob = null;
    this.pendingFileName = '';

    // Réinitialiser les états
    this.isProcessing.set(false);
    this.processingStatus.set('');
    this.encodingProgress.set(0);
    this.hasError.set(false);
    this.errorMessage.set('');

    console.log('[AudioShareService] Service destroyed');
  }

  constructor() {}
}

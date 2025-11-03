import { Component, inject, computed, ViewChild, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPlayerService, ToneEngineService, RubberbandEngineService } from '../../services';
import { AudioControlsModalComponent } from '../audio-controls-modal';
import { AudioShareService } from '../../../../shared/services/audio-share.service';
import { NotificationService } from '../../../../core/services';

@Component({
  selector: 'app-audio-player',
  imports: [CommonModule, AudioControlsModalComponent],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss'
})
export class AudioPlayerComponent {
  private readonly audioPlayerService = inject(AudioPlayerService);
  private readonly toneEngine = inject(ToneEngineService);
  private readonly rubberbandEngine = inject(RubberbandEngineService);
  private readonly audioShareService = inject(AudioShareService);
  private readonly notificationService = inject(NotificationService);

  @ViewChild(AudioControlsModalComponent) audioControlsModal?: AudioControlsModalComponent;

  // Input signal pour le nom du fichier audio courant
  readonly fileName = input<string>('');

  // Signals du service
  readonly isPlaying = this.audioPlayerService.isPlaying;
  readonly isReady = this.audioPlayerService.isReady;
  readonly currentTime = this.audioPlayerService.currentTime;
  readonly duration = this.audioPlayerService.duration;

  // Computed pour l'affichage des temps au format MM:SS
  readonly formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  readonly formattedDuration = computed(() => this.formatTime(this.duration()));

  // Computed pour les indicateurs de modifications actives
  readonly currentPitch = this.rubberbandEngine.pitch;
  readonly currentSpeed = this.toneEngine.playbackRate;

  readonly hasActiveModifications = computed(() => {
    return this.currentPitch() !== 0 || this.currentSpeed() !== 1.0;
  });

  readonly modificationsLabel = computed(() => {
    const pitch = this.currentPitch();
    const speed = this.currentSpeed();
    const parts: string[] = [];

    if (pitch !== 0) {
      parts.push(pitch > 0 ? `+${pitch}` : `${pitch}`);
    }
    if (speed !== 1.0) {
      parts.push(`${speed}x`);
    }

    return parts.join(' • ') || '';
  });

  // Computed pour les badges individuels
  readonly hasActivePitch = computed(() => this.currentPitch() !== 0);
  readonly hasActiveSpeed = computed(() => this.currentSpeed() !== 1.0);

  readonly pitchLabel = computed(() => {
    const pitch = this.currentPitch();
    return pitch > 0 ? `+${pitch}` : `${pitch}`;
  });

  readonly speedLabel = computed(() => {
    return `${this.currentSpeed().toFixed(2)}x`;
  });

  // Signals du service de téléchargement
  readonly isDownloading = this.audioShareService.isProcessing;
  readonly downloadingProgress = this.audioShareService.encodingProgress;
  readonly downloadingStatus = this.audioShareService.processingStatus;
  readonly downloadingError = this.audioShareService.hasError;
  readonly downloadingErrorMessage = this.audioShareService.errorMessage;

  /**
   * Toggle play/pause
   */
  togglePlayPause(): void {
    if (this.isPlaying()) {
      this.audioPlayerService.pause();
    } else {
      this.audioPlayerService.play();
    }
  }

  /**
   * Ouvrir le modal des contrôles audio
   */
  openAudioControls(): void {
    this.audioControlsModal?.open();
  }

  /**
   * Télécharge l'audio avec les modifications appliquées (pitch, tempo)
   *
   * Processus :
   * 1. Récupère le buffer audio traité (avec pitch et tempo)
   * 2. Génère un nom de fichier avec métadonnées
   * 3. Encode en MP3 via Web Worker
   * 4. Télécharge directement le fichier
   */
  async downloadAudio(): Promise<void> {
    console.log('[AudioPlayerComponent] Download button clicked');

    // Vérifier qu'un audio est chargé
    if (!this.isReady()) {
      console.error('[AudioPlayerComponent] No audio loaded');
      this.notificationService.warning('Aucun audio n\'est chargé.');
      return;
    }

    try {
      // Récupérer le buffer audio traité avec pitch et tempo appliqués
      const processedBuffer = this.rubberbandEngine.getCurrentProcessedBuffer();

      if (!processedBuffer) {
        console.error('[AudioPlayerComponent] No processed buffer available');
        this.notificationService.warning(
          'Le buffer audio n\'est pas encore disponible. Veuillez attendre la fin du traitement.',
          4000
        );
        return;
      }

      // Récupérer les paramètres actuels pour les métadonnées
      const currentPitch = this.currentPitch();
      const currentSpeed = this.currentSpeed();

      // Extraire le nom de base du fichier (sans extension)
      const originalFileName = this.fileName();
      const baseFileName = originalFileName
        ? originalFileName.replace(/\.[^/.]+$/, '') // Retirer l'extension
        : 'audio';

      // Nettoyage du nom pour la compatibilité système de fichiers
      const sanitizedBaseName = baseFileName
        .replace(/[^a-zA-Z0-9_\-]/g, '_') // Remplacer caractères spéciaux par _
        .replace(/__+/g, '_') // Remplacer multiples _ par un seul
        .substring(0, 50); // Limiter à 50 caractères

      // Générer un nom de fichier avec métadonnées
      const pitchStr = currentPitch !== 0 ? `_pitch${currentPitch >= 0 ? '+' : ''}${currentPitch}` : '';
      const speedStr = currentSpeed !== 1.0 ? `_speed${currentSpeed}x` : '';
      const timestamp = new Date().getTime();
      const fileName = `${sanitizedBaseName}${pitchStr}${speedStr}_${timestamp}.mp3`;

      console.log('[AudioPlayerComponent] Starting download process', {
        fileName,
        pitch: currentPitch,
        speed: currentSpeed,
        bufferDuration: processedBuffer.duration,
        bufferChannels: processedBuffer.numberOfChannels,
        bufferSampleRate: processedBuffer.sampleRate
      });

      // Afficher une notification d'information au démarrage
      this.notificationService.info('Encodage MP3 en cours...', 2000);

      // Télécharger l'audio
      await this.audioShareService.downloadAudio(
        processedBuffer,
        fileName,
        currentPitch,
        currentSpeed
      );

      console.log('[AudioPlayerComponent] Download started successfully');
      this.notificationService.success('Téléchargement lancé !', 3000);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue lors du téléchargement';
      console.error('[AudioPlayerComponent] Download error:', errorMsg);

      // Gérer les différents types d'erreurs
      if (error instanceof Error) {
        // Erreur de quota/taille de fichier
        if (errorMsg.includes('quota') || errorMsg.includes('size')) {
          this.notificationService.error(
            'Le fichier est trop volumineux pour être téléchargé.',
            5000
          );
          return;
        }

        // Erreur d'encodage
        if (errorMsg.includes('encoding') || errorMsg.includes('MP3')) {
          this.notificationService.error(
            'Erreur lors de l\'encodage MP3. Veuillez réessayer.',
            5000
          );
          return;
        }
      }

      // Erreur générique
      this.notificationService.error(
        `Erreur lors du téléchargement : ${errorMsg}`,
        5000
      );
    }
  }

  /**
   * Formate le temps en MM:SS
   */
  formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) {
      return '00:00';
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

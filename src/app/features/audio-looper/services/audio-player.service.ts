import { Injectable, signal, inject } from '@angular/core';
import { ToneEngineService } from './tone-engine.service';

@Injectable({
  providedIn: 'root'
})
export class AudioPlayerService {
  private readonly toneEngine = inject(ToneEngineService);

  // Référence au volume avant mute
  private volumeBeforeMute: number = 100;

  // Signals pour l'état audio (délégués au ToneEngineService)
  readonly isPlaying = this.toneEngine.isPlaying;
  readonly currentTime = this.toneEngine.currentTime;
  readonly duration = this.toneEngine.duration;
  readonly isReady = this.toneEngine.isReady;
  readonly volume = signal<number>(100);
  readonly isMuted = signal<boolean>(false);

  constructor() {
    // Vérifier le support audio du navigateur
    this.checkAudioSupport();
  }

  /**
   * Vérifie que le navigateur supporte l'audio
   */
  private checkAudioSupport(): void {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        throw new Error('AudioContext non supporté');
      }
    } catch (error) {
      console.error('Le navigateur ne supporte pas l\'API Web Audio:', error);
      throw new Error('Audio non supporté par le navigateur');
    }
  }

  /**
   * Charge un fichier audio
   */
  async loadAudioFile(file: File): Promise<void> {
    try {
      await this.toneEngine.loadAudioFile(file);
    } catch (error) {
      console.error('Erreur lors du chargement du fichier:', error);
      throw error;
    }
  }

  /**
   * Lance la lecture
   */
  play(): void {
    try {
      this.toneEngine.play();
    } catch (error) {
      console.error('Erreur lors de la lecture:', error);
      throw error;
    }
  }

  /**
   * Met en pause la lecture
   */
  pause(): void {
    try {
      this.toneEngine.pause();
    } catch (error) {
      console.error('Erreur lors de la mise en pause:', error);
      throw error;
    }
  }

  /**
   * Déplace la tête de lecture à une position donnée
   */
  seekTo(time: number): void {
    try {
      this.toneEngine.seekTo(time);
    } catch (error) {
      console.error('Erreur lors du déplacement de la tête de lecture:', error);
      throw error;
    }
  }

  /**
   * Définit le volume (0-100)
   */
  setVolume(volume: number): void {
    // Limiter entre 0 et 100
    const clampedVolume = Math.max(0, Math.min(100, volume));
    this.volume.set(clampedVolume);

    // Convertir en gain (0.0 à 1.0) et appliquer
    const gain = clampedVolume / 100;

    // Note: Le volume sera géré via le gainNode dans ToneEngineService
    // Pour l'instant on stocke juste la valeur
    if (this.toneEngine['gainNode']) {
      this.toneEngine['gainNode'].gain.value = gain;
    }

    // Si le volume est remis au-dessus de 0, désactiver le mute
    if (clampedVolume > 0 && this.isMuted()) {
      this.isMuted.set(false);
    }
  }

  /**
   * Active/désactive le mute
   */
  toggleMute(): void {
    const newMuteState = !this.isMuted();
    this.isMuted.set(newMuteState);

    if (newMuteState) {
      // Sauvegarder le volume actuel et muter
      this.volumeBeforeMute = this.volume();
      this.setVolume(0);
    } else {
      // Restaurer le volume précédent
      this.setVolume(this.volumeBeforeMute);
    }
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.toneEngine.dispose();
  }
}

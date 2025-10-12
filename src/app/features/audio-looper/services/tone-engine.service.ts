import { Injectable, signal } from '@angular/core';
import * as Tone from 'tone';

@Injectable({
  providedIn: 'root'
})
export class ToneEngineService {
  // Tone.js player et effets
  private player: Tone.Player | null = null;
  private pitchShift: Tone.PitchShift | null = null;
  private gainNode: Tone.Gain | null = null;
  private startTime: number = 0; // Timestamp de démarrage de la lecture
  private startOffset: number = 0; // Position de départ dans l'audio (en secondes)

  // Signals pour les contrôles audio
  readonly pitch = signal<number>(0); // -6 à +6 demi-tons
  readonly playbackRate = signal<number>(1.0); // 0.5x, 0.75x, 1.0x
  readonly loopStart = signal<number | null>(null);
  readonly loopEnd = signal<number | null>(null);
  readonly isLooping = signal<boolean>(false);
  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly isReady = signal<boolean>(false);
  readonly audioContextState = signal<AudioContextState>('suspended');

  constructor() {
    this.initializeTone();
  }

  /**
   * Initialise le contexte audio Tone.js
   */
  private initializeTone(): void {
    try {
      // Surveiller l'état du contexte audio
      this.audioContextState.set(Tone.getContext().state);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Tone.js:', error);
      throw new Error('Audio non supporté par le navigateur');
    }
  }

  /**
   * Démarre le contexte audio (requis par les politiques autoplay)
   */
  async startAudioContext(): Promise<void> {
    try {
      await Tone.start();
      this.audioContextState.set(Tone.getContext().state);
      console.log('Contexte audio démarré');
    } catch (error) {
      console.error('Erreur lors du démarrage du contexte audio:', error);
      throw new Error('Impossible de démarrer le contexte audio');
    }
  }

  /**
   * Charge un fichier audio
   */
  async loadAudioFile(file: File): Promise<void> {
    try {
      // S'assurer que le contexte audio est démarré
      if (Tone.getContext().state !== 'running') {
        await this.startAudioContext();
      }

      // Nettoyer les instances précédentes
      this.dispose();

      // Créer un URL du fichier
      const fileUrl = URL.createObjectURL(file);

      // Créer le player
      this.player = new Tone.Player({
        url: fileUrl,
        loop: false,
        onload: () => {
          this.isReady.set(true);
          this.duration.set(this.player!.buffer.duration);
          console.log('Fichier audio chargé:', file.name);
        }
      });

      // Créer les effets
      this.pitchShift = new Tone.PitchShift(0);
      this.gainNode = new Tone.Gain(1);

      // Connecter la chaîne audio: Player -> PitchShift -> Gain -> Destination
      this.player.chain(this.pitchShift, this.gainNode, Tone.getDestination());

      // Attendre que le fichier soit chargé
      await Tone.loaded();

    } catch (error) {
      console.error('Erreur lors du chargement du fichier audio:', error);
      this.isReady.set(false);
      throw new Error('Impossible de charger le fichier audio');
    }
  }

  /**
   * Lance la lecture
   */
  play(): void {
    if (!this.player || !this.isReady()) {
      console.warn('Aucun fichier audio chargé');
      return;
    }

    try {
      // Démarrer depuis la position actuelle (startOffset)
      this.player.start(undefined, this.startOffset);
      this.startTime = Tone.now();
      this.isPlaying.set(true);
      this.startTimeUpdate();
    } catch (error) {
      console.error('Erreur lors de la lecture:', error);
    }
  }

  /**
   * Met en pause la lecture
   */
  pause(): void {
    if (!this.player) return;

    try {
      // Calculer la position actuelle avant d'arrêter
      const elapsed = (Tone.now() - this.startTime) * this.playbackRate();
      this.startOffset = Math.min(this.startOffset + elapsed, this.duration());
      this.currentTime.set(this.startOffset);

      this.player.stop();
      this.isPlaying.set(false);
    } catch (error) {
      console.error('Erreur lors de la mise en pause:', error);
    }
  }

  /**
   * Déplace la tête de lecture
   */
  seekTo(time: number): void {
    if (!this.player || !this.isReady()) return;

    try {
      // Limiter le temps entre 0 et la durée
      const clampedTime = Math.max(0, Math.min(time, this.duration()));

      const wasPlaying = this.isPlaying();

      if (wasPlaying) {
        this.player.stop();
      }

      // Mettre à jour la position de départ
      this.startOffset = clampedTime;
      this.currentTime.set(clampedTime);

      if (wasPlaying) {
        // Redémarrer depuis la nouvelle position
        this.player.start(undefined, this.startOffset);
        this.startTime = Tone.now();
      }
    } catch (error) {
      console.error('Erreur lors du déplacement de la tête de lecture:', error);
    }
  }

  /**
   * Définit le pitch shift (-6 à +6 demi-tons)
   */
  setPitch(semitones: number): void {
    // Limiter entre -6 et +6
    const clampedPitch = Math.max(-6, Math.min(6, semitones));
    this.pitch.set(clampedPitch);

    if (this.pitchShift) {
      this.pitchShift.pitch = clampedPitch;
    }
  }

  /**
   * Définit la vitesse de lecture (0.5x, 0.75x, 1.0x)
   */
  setPlaybackRate(rate: number): void {
    this.playbackRate.set(rate);

    if (this.player) {
      this.player.playbackRate = rate;
    }
  }

  /**
   * Définit les points de boucle A et B
   */
  setLoopPoints(start: number, end: number): void {
    if (start >= end) {
      console.warn('Le point de départ doit être inférieur au point de fin');
      return;
    }

    this.loopStart.set(start);
    this.loopEnd.set(end);

    if (this.player) {
      this.player.loop = this.isLooping();
      this.player.loopStart = start;
      this.player.loopEnd = end;
    }
  }

  /**
   * Active/désactive la boucle
   */
  toggleLoop(): void {
    const newLoopState = !this.isLooping();
    this.isLooping.set(newLoopState);

    if (this.player) {
      this.player.loop = newLoopState;

      // Si la boucle est activée et que les points sont définis
      if (newLoopState && this.loopStart() !== null && this.loopEnd() !== null) {
        this.player.loopStart = this.loopStart()!;
        this.player.loopEnd = this.loopEnd()!;
      }
    }
  }

  /**
   * Réinitialise le pitch à 0
   */
  resetPitch(): void {
    this.setPitch(0);
  }

  /**
   * Réinitialise la boucle
   */
  resetLoop(): void {
    this.loopStart.set(null);
    this.loopEnd.set(null);
    this.isLooping.set(false);

    if (this.player) {
      this.player.loop = false;
    }
  }

  /**
   * Met à jour le temps courant périodiquement
   */
  private startTimeUpdate(): void {
    const updateInterval = setInterval(() => {
      if (!this.player || !this.isPlaying()) {
        clearInterval(updateInterval);
        return;
      }

      // Calculer le temps courant basé sur le temps écoulé depuis le démarrage
      const elapsed = (Tone.now() - this.startTime) * this.playbackRate();
      const currentSeconds = this.startOffset + elapsed;
      this.currentTime.set(currentSeconds);

      // Vérifier si on a atteint la fin
      if (currentSeconds >= this.duration()) {
        this.isPlaying.set(false);
        this.startOffset = 0;
        this.currentTime.set(0);
        clearInterval(updateInterval);
      }
    }, 100); // Mise à jour toutes les 100ms
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    if (this.player) {
      this.player.dispose();
      this.player = null;
    }

    if (this.pitchShift) {
      this.pitchShift.dispose();
      this.pitchShift = null;
    }

    if (this.gainNode) {
      this.gainNode.dispose();
      this.gainNode = null;
    }

    this.isReady.set(false);
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.duration.set(0);
  }
}

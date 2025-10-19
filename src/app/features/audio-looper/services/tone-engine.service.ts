import { Injectable, signal, inject } from '@angular/core';
import * as Tone from 'tone';
import { RubberbandEngineService } from './rubberband-engine.service';

@Injectable({
  providedIn: 'root'
})
export class ToneEngineService {
  // Injection du service Rubberband
  private readonly rubberbandEngine = inject(RubberbandEngineService);
  // Tone.js player et effets
  private player: Tone.Player | null = null;
  private gainNode: Tone.Gain | null = null;
  private startTime: number = 0; // Timestamp de démarrage de la lecture
  private startOffset: number = 0; // Position de départ dans l'audio (en secondes)

  // Buffer audio original (pour Rubberband processing)
  private originalAudioBuffer: AudioBuffer | null = null;

  // Signals pour les contrôles audio
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

          // Stocker le buffer original et l'envoyer à Rubberband
          if (this.player?.buffer) {
            this.originalAudioBuffer = this.player.buffer.get() as AudioBuffer;
            this.rubberbandEngine.loadOriginalBuffer(this.originalAudioBuffer);
          }
        }
      });

      // Créer le noeud de gain pour le volume
      this.gainNode = new Tone.Gain(1);

      // Connecter la chaîne audio: Player -> Gain -> Destination
      // Note: Le pitch shifting est géré par Rubberband dans le buffer, pas par Tone.js
      this.player.chain(this.gainNode, Tone.getDestination());

      // S'abonner aux buffers traités de Rubberband
      this.rubberbandEngine.getProcessedBuffer().subscribe(processedBuffer => {
        this.replaceAudioBuffer(processedBuffer);
      });

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
   * Le pitch shifting est géré par Rubberband qui modifie le buffer audio
   */
  setPitch(semitones: number): void {
    // Appeler RubberbandEngine pour traiter l'audio avec le pitch voulu
    this.rubberbandEngine.setPitch(semitones);
  }

  /**
   * Définit la vitesse de lecture (0.5x, 0.75x, 1.0x)
   * Note: La vitesse est gérée par Rubberband qui traite le buffer.
   * Le player Tone.js reste à vitesse normale (1.0x) car le tempo est déjà appliqué.
   */
  setPlaybackRate(rate: number): void {
    this.playbackRate.set(rate);

    // Synchroniser avec RubberbandEngine pour traiter le buffer avec le nouveau tempo
    this.rubberbandEngine.setPlaybackRate(rate);

    // NOTE: Le player Tone.js reste à playbackRate = 1.0 car le tempo est déjà
    // appliqué dans le buffer traité par Rubberband. Changer le playbackRate du
    // player créerait un double effet de vitesse (Rubberband + Tone.js).
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
   * Met à jour le temps courant périodiquement et gère la boucle A/B
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

      // Gestion de la boucle A/B manuelle
      if (this.isLooping() && this.loopStart() !== null && this.loopEnd() !== null) {
        const loopEnd = this.loopEnd()!;

        // Si on a atteint ou dépassé le point B, revenir au point A
        if (currentSeconds >= loopEnd) {
          const loopStart = this.loopStart()!;

          // Arrêter la lecture actuelle
          this.player.stop();

          // Redémarrer depuis le point A
          this.startOffset = loopStart;
          this.currentTime.set(loopStart);
          this.player.start(undefined, loopStart);
          this.startTime = Tone.now();

          console.log(`[Loop] Retour au point A: ${loopStart.toFixed(2)}s`);
        }
      } else {
        // Vérifier si on a atteint la fin (comportement normal sans boucle)
        if (currentSeconds >= this.duration()) {
          this.isPlaying.set(false);
          this.startOffset = 0;
          this.currentTime.set(0);
          clearInterval(updateInterval);
        }
      }
    }, 100); // Mise à jour toutes les 100ms
  }

  /**
   * Ajuste les points de boucle A/B selon la nouvelle durée du buffer
   * Préserve les proportions si possible, sinon les marque comme invalides
   * @param newDuration Nouvelle durée du buffer audio en secondes
   */
  private adjustLoopPoints(newDuration: number): void {
    const currentLoopStart = this.loopStart();
    const currentLoopEnd = this.loopEnd();

    // Si aucune boucle n'est définie, rien à faire
    if (currentLoopStart === null || currentLoopEnd === null) {
      return;
    }

    // Si la durée originale n'est pas disponible, on ne peut pas ajuster
    if (!this.originalAudioBuffer) {
      console.warn('[ToneEngineService] No original buffer for loop adjustment');
      return;
    }

    const originalDuration = this.originalAudioBuffer.duration;
    const ratio = newDuration / originalDuration;

    // Calculer les nouveaux points de boucle proportionnellement
    const newLoopStart = currentLoopStart * ratio;
    const newLoopEnd = currentLoopEnd * ratio;

    // Valider que les nouveaux points sont dans la plage valide
    if (newLoopStart >= 0 && newLoopEnd <= newDuration && newLoopStart < newLoopEnd) {
      this.loopStart.set(newLoopStart);
      this.loopEnd.set(newLoopEnd);

      // Mettre à jour le player si la boucle est active
      if (this.player && this.isLooping()) {
        this.player.loopStart = newLoopStart;
        this.player.loopEnd = newLoopEnd;
      }

      console.log('[ToneEngineService] Loop points adjusted', {
        originalDuration,
        newDuration,
        ratio,
        oldStart: currentLoopStart,
        oldEnd: currentLoopEnd,
        newStart: newLoopStart,
        newEnd: newLoopEnd
      });
    } else {
      // Si les points ajustés sont invalides, réinitialiser la boucle
      console.warn('[ToneEngineService] Adjusted loop points invalid, resetting loop');
      this.resetLoop();
    }
  }

  /**
   * Remplace le buffer audio du player tout en préservant l'état de lecture
   * @param newBuffer Nouveau AudioBuffer à utiliser
   */
  private replaceAudioBuffer(newBuffer: AudioBuffer): void {
    if (!this.player) {
      console.warn('[ToneEngineService] No player to replace buffer');
      return;
    }

    try {
      // Sauvegarder l'état actuel
      const wasPlaying = this.isPlaying();
      const currentPosition = this.currentTime();

      // Arrêter la lecture si en cours
      if (wasPlaying) {
        this.player.stop();
      }

      // Remplacer le buffer
      const toneBuffer = new Tone.ToneAudioBuffer(newBuffer);
      this.player.buffer = toneBuffer;

      // Mettre à jour la durée
      const newDuration = newBuffer.duration;
      this.duration.set(newDuration);

      // Ajuster les points de boucle si nécessaire
      this.adjustLoopPoints(newDuration);

      // Ajuster la position de lecture si elle dépasse la nouvelle durée
      if (currentPosition > newDuration) {
        this.startOffset = 0;
        this.currentTime.set(0);
      } else {
        this.startOffset = currentPosition;
      }

      // Restaurer la lecture si elle était en cours
      if (wasPlaying) {
        this.player.start(undefined, this.startOffset);
        this.startTime = Tone.now();
        this.startTimeUpdate();
      }

      console.log('[ToneEngineService] Buffer replaced successfully', {
        newDuration,
        wasPlaying,
        currentPosition
      });
    } catch (error) {
      console.error('[ToneEngineService] Error replacing buffer:', error);
    }
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    if (this.player) {
      this.player.dispose();
      this.player = null;
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

import { Injectable, signal, computed, effect, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, fromEvent, interval, EMPTY } from 'rxjs';
import { switchMap, takeWhile, distinctUntilChanged } from 'rxjs/operators';

import { YouTubeApiLoaderService } from './youtube-api-loader.service';
import {
  YouTubePlayer,
  YouTubePlayerState,
  YouTubePlayerErrorCode,
  YouTubePlayerServiceState,
  LoadVideoOptions,
  YouTubePlayerServiceConfig,
  YouTubePlayerOptions,
  YouTubePlayerEvent,
  YouTubePlayerStateChangeEvent,
  YouTubePlayerErrorEvent
} from '../types';

@Injectable({
  providedIn: 'root'
})
export class YouTubePlayerService {
  private readonly apiLoader = inject(YouTubeApiLoaderService);
  private readonly destroyRef = inject(DestroyRef);

  // Instance du lecteur YouTube
  private player: YouTubePlayer | null = null;
  private elementId: string | null = null;

  // Signals pour l'état du service
  private readonly _isReady = signal<boolean>(false);
  private readonly _isPlaying = signal<boolean>(false);
  private readonly _isPaused = signal<boolean>(false);
  private readonly _currentTime = signal<number>(0);
  private readonly _duration = signal<number>(0);
  private readonly _volume = signal<number>(100);
  private readonly _isMuted = signal<boolean>(false);
  private readonly _playbackRate = signal<number>(1);
  private readonly _state = signal<YouTubePlayerState>(YouTubePlayerState.UNSTARTED);
  private readonly _error = signal<YouTubePlayerErrorCode | null>(null);
  private readonly _videoId = signal<string | null>(null);

  // Signals publics en lecture seule
  readonly isReady = this._isReady.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();
  readonly isPaused = this._isPaused.asReadonly();
  readonly currentTime = this._currentTime.asReadonly();
  readonly duration = this._duration.asReadonly();
  readonly volume = this._volume.asReadonly();
  readonly isMuted = this._isMuted.asReadonly();
  readonly playbackRate = this._playbackRate.asReadonly();
  readonly state = this._state.asReadonly();
  readonly error = this._error.asReadonly();
  readonly videoId = this._videoId.asReadonly();

  // Signals computed
  readonly playerState = computed<YouTubePlayerServiceState>(() => ({
    isReady: this._isReady(),
    isPlaying: this._isPlaying(),
    isPaused: this._isPaused(),
    currentTime: this._currentTime(),
    duration: this._duration(),
    volume: this._volume(),
    isMuted: this._isMuted(),
    playbackRate: this._playbackRate(),
    state: this._state(),
    error: this._error(),
    videoId: this._videoId()
  }));

  readonly canPlay = computed(() => 
    this._isReady() && 
    this._videoId() !== null && 
    this._error() === null &&
    (this._state() === YouTubePlayerState.PAUSED || 
     this._state() === YouTubePlayerState.CUED ||
     this._state() === YouTubePlayerState.ENDED)
  );

  readonly canPause = computed(() => 
    this._isReady() && 
    this._state() === YouTubePlayerState.PLAYING
  );

  // Observable pour le temps de lecture
  private timeUpdateSubject = new BehaviorSubject<boolean>(false);

  constructor() {
    this.setupTimeUpdates();
  }

  /**
   * Initialise le lecteur YouTube dans un élément DOM
   */
  async initializePlayer(
    elementId: string, 
    config: YouTubePlayerServiceConfig = {}
  ): Promise<void> {
    try {
      // S'assurer que l'API YouTube est chargée
      await this.apiLoader.loadYouTubeAPI();

      // Nettoyer le lecteur précédent s'il existe
      this.cleanup();

      this.elementId = elementId;

      // Créer une promesse qui se résout quand le player est prêt
      const playerReadyPromise = new Promise<void>((resolve, reject) => {
        const playerOptions: YouTubePlayerOptions = {
          width: config.width || '100%',
          height: config.height || '100%',
          playerVars: {
            enablejsapi: 1,
            origin: window.location.origin,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            ...config.playerVars
          },
          events: {
            onReady: (event: YouTubePlayerEvent) => {
              this.onPlayerReady(event);
              resolve(); // Résoudre la promesse quand le player est prêt
            },
            onStateChange: this.onPlayerStateChange.bind(this),
            onError: (event: YouTubePlayerErrorEvent) => {
              this.onPlayerError(event);
              reject(new Error(`Erreur du lecteur YouTube: ${event.data}`));
            }
          }
        };

        this.player = new window.YT.Player(elementId, playerOptions);
      });

      // Attendre que le player soit vraiment prêt
      await playerReadyPromise;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du lecteur YouTube:', error);
      throw error;
    }
  }

  /**
   * Charge une vidéo YouTube
   */
  async loadVideo(options: LoadVideoOptions): Promise<void> {
    if (!this.player || !this._isReady()) {
      throw new Error('Le lecteur YouTube n\'est pas prêt');
    }

    try {
      this._error.set(null);
      this._videoId.set(options.videoId);

      if (options.autoplay) {
        this.player.loadVideoById(
          options.videoId,
          options.startSeconds || 0,
          options.suggestedQuality || 'default'
        );
      } else {
        this.player.cueVideoById(
          options.videoId,
          options.startSeconds || 0,
          options.suggestedQuality || 'default'
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la vidéo:', error);
      throw error;
    }
  }

  /**
   * Lance la lecture
   */
  play(): void {
    if (!this.canPlay()) {
      console.warn('Impossible de lancer la lecture');
      return;
    }
    this.player?.playVideo();
  }

  /**
   * Met en pause
   */
  pause(): void {
    if (!this.canPause()) {
      console.warn('Impossible de mettre en pause');
      return;
    }
    this.player?.pauseVideo();
  }

  /**
   * Arrête la lecture
   */
  stop(): void {
    if (!this._isReady()) return;
    this.player?.stopVideo();
  }

  /**
   * Navigue à un moment spécifique
   */
  seekTo(seconds: number, allowSeekAhead: boolean = true): void {
    if (!this._isReady()) return;
    this.player?.seekTo(seconds, allowSeekAhead);
  }

  /**
   * Définit le volume
   */
  setVolume(volume: number): void {
    if (!this._isReady()) return;
    const normalizedVolume = Math.max(0, Math.min(100, volume));
    this.player?.setVolume(normalizedVolume);
    this._volume.set(normalizedVolume);
  }

  /**
   * Active/désactive le son
   */
  toggleMute(): void {
    if (!this._isReady()) return;
    
    if (this._isMuted()) {
      this.player?.unMute();
    } else {
      this.player?.mute();
    }
  }

  /**
   * Définit la vitesse de lecture
   */
  setPlaybackRate(rate: number): void {
    if (!this._isReady()) return;
    this.player?.setPlaybackRate(rate);
  }

  /**
   * Obtient les vitesses de lecture disponibles
   */
  getAvailablePlaybackRates(): number[] {
    if (!this._isReady()) return [];
    return this.player?.getAvailablePlaybackRates() || [];
  }

  /**
   * Nettoie le lecteur
   */
  cleanup(): void {
    this.timeUpdateSubject.next(false);
    
    if (this.player) {
      try {
        this.player.destroy();
      } catch (error) {
        console.warn('Erreur lors de la destruction du lecteur:', error);
      }
      this.player = null;
    }

    this.resetState();
  }

  /**
   * Callback quand le lecteur est prêt
   */
  private onPlayerReady(event: YouTubePlayerEvent): void {
    console.log('Lecteur YouTube prêt');
    this._isReady.set(true);
    this.updatePlayerInfo();
  }

  /**
   * Callback pour les changements d'état
   */
  private onPlayerStateChange(event: YouTubePlayerStateChangeEvent): void {
    const state = event.data;
    this._state.set(state);

    switch (state) {
      case YouTubePlayerState.PLAYING:
        this._isPlaying.set(true);
        this._isPaused.set(false);
        this.timeUpdateSubject.next(true);
        break;
        
      case YouTubePlayerState.PAUSED:
        this._isPlaying.set(false);
        this._isPaused.set(true);
        this.timeUpdateSubject.next(false);
        break;
        
      case YouTubePlayerState.ENDED:
      case YouTubePlayerState.BUFFERING:
      case YouTubePlayerState.CUED:
        this._isPlaying.set(false);
        this._isPaused.set(false);
        if (state !== YouTubePlayerState.BUFFERING) {
          this.timeUpdateSubject.next(false);
        }
        break;
    }

    this.updatePlayerInfo();
  }

  /**
   * Callback pour les erreurs
   */
  private onPlayerError(event: YouTubePlayerErrorEvent): void {
    const errorCode = event.data;
    console.error('Erreur du lecteur YouTube:', errorCode);
    this._error.set(errorCode);
    this._isPlaying.set(false);
    this._isPaused.set(false);
    this.timeUpdateSubject.next(false);
  }

  /**
   * Met à jour les informations du lecteur
   */
  private updatePlayerInfo(): void {
    if (!this.player || !this._isReady()) return;

    try {
      this._duration.set(this.player.getDuration() || 0);
      this._currentTime.set(this.player.getCurrentTime() || 0);
      this._volume.set(this.player.getVolume() || 100);
      this._isMuted.set(this.player.isMuted() || false);
      this._playbackRate.set(this.player.getPlaybackRate() || 1);
    } catch (error) {
      console.warn('Erreur lors de la mise à jour des informations du lecteur:', error);
    }
  }

  /**
   * Configure les mises à jour de temps
   */
  private setupTimeUpdates(): void {
    this.timeUpdateSubject
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(shouldUpdate => 
          shouldUpdate ? interval(100) : EMPTY
        )
      )
      .subscribe(() => {
        if (this.player && this._isReady()) {
          const currentTime = this.player.getCurrentTime();
          this._currentTime.set(currentTime);
        }
      });
  }

  /**
   * Remet à zéro l'état du service
   */
  private resetState(): void {
    this._isReady.set(false);
    this._isPlaying.set(false);
    this._isPaused.set(false);
    this._currentTime.set(0);
    this._duration.set(0);
    this._volume.set(100);
    this._isMuted.set(false);
    this._playbackRate.set(1);
    this._state.set(YouTubePlayerState.UNSTARTED);
    this._error.set(null);
    this._videoId.set(null);
    this.elementId = null;
  }
}
import { Component, signal, inject, AfterViewInit, ViewChild, ElementRef, computed, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { YouTubePlayerService, YouTubePlayerErrorCode, YouTubePlayerState } from '../../../../core';

@Component({
  selector: 'app-video-player',
  imports: [],
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoPlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('playerContainer', { static: true }) playerContainer!: ElementRef<HTMLDivElement>;
  
  private youTubePlayerService = inject(YouTubePlayerService);
  private playerId = 'youtube-player-' + Math.random().toString(36).substr(2, 9);
  
  // Signals basés sur le service
  readonly playerState = this.youTubePlayerService.playerState;
  readonly isReady = this.youTubePlayerService.isReady;
  readonly error = this.youTubePlayerService.error;
  readonly state = this.youTubePlayerService.state;
  readonly videoId = this.youTubePlayerService.videoId;
  
  // Signals computed pour l'UI
  readonly isLoading = computed(() => 
    !this.isReady() || this.state() === YouTubePlayerState.BUFFERING
  );
  
  readonly hasError = computed(() => this.error() !== null);
  
  readonly errorMessage = computed(() => {
    const errorCode = this.error();
    if (!errorCode) return '';
    
    switch (errorCode) {
      case YouTubePlayerErrorCode.INVALID_PARAM:
        return 'Paramètre de vidéo invalide';
      case YouTubePlayerErrorCode.HTML5_ERROR:
        return 'Erreur du lecteur HTML5';
      case YouTubePlayerErrorCode.VIDEO_NOT_FOUND:
        return 'Vidéo non trouvée ou supprimée';
      case YouTubePlayerErrorCode.VIDEO_NOT_ALLOWED:
        return 'Vidéo privée ou restreinte géographiquement';
      default:
        return 'Erreur inconnue lors de la lecture';
    }
  });
  
  async ngAfterViewInit(): Promise<void> {
    try {
      // Définir un ID unique pour le conteneur
      this.playerContainer.nativeElement.id = this.playerId;
      
      // Initialiser le lecteur YouTube
      await this.youTubePlayerService.initializePlayer(this.playerId, {
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 1, // Autoriser le plein écran
          cc_load_policy: 0, // Pas de sous-titres par défaut
          iv_load_policy: 3, // Pas d'annotations
          disablekb: 0 // Autoriser le contrôle clavier
        }
      });
      
      console.log('VideoPlayerComponent initialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du VideoPlayerComponent:', error);
    }
  }
  
  ngOnDestroy(): void {
    this.youTubePlayerService.cleanup();
  }
  
  // Méthodes publiques pour contrôler le lecteur
  async loadVideo(videoId: string, autoplay: boolean = false): Promise<void> {
    try {
      await this.youTubePlayerService.loadVideo({
        videoId,
        autoplay,
        startSeconds: 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement de la vidéo:', error);
    }
  }
  
  play(): void {
    this.youTubePlayerService.play();
  }
  
  pause(): void {
    this.youTubePlayerService.pause();
  }
  
  stop(): void {
    this.youTubePlayerService.stop();
  }
  
  seekTo(seconds: number): void {
    this.youTubePlayerService.seekTo(seconds);
  }
  
  // Méthodes supplémentaires pour la communication bidirectionnelle
  getCurrentTime(): number {
    return this.youTubePlayerService.currentTime();
  }
  
  getDuration(): number {
    return this.youTubePlayerService.duration();
  }
  
  getVolume(): number {
    return this.youTubePlayerService.volume();
  }
  
  setVolume(volume: number): void {
    this.youTubePlayerService.setVolume(volume);
  }
  
  toggleMute(): void {
    this.youTubePlayerService.toggleMute();
  }
  
  setPlaybackRate(rate: number): void {
    this.youTubePlayerService.setPlaybackRate(rate);
  }
  
  getAvailablePlaybackRates(): number[] {
    return this.youTubePlayerService.getAvailablePlaybackRates();
  }
  
  // Getters pour accéder facilement aux states
  get canPlay(): boolean {
    return this.youTubePlayerService.canPlay();
  }
  
  get canPause(): boolean {
    return this.youTubePlayerService.canPause();
  }
  
  get isPlaying(): boolean {
    return this.youTubePlayerService.isPlaying();
  }
  
  get isPaused(): boolean {
    return this.youTubePlayerService.isPaused();
  }
  
  get isMuted(): boolean {
    return this.youTubePlayerService.isMuted();
  }
  
  get playbackRate(): number {
    return this.youTubePlayerService.playbackRate();
  }
}

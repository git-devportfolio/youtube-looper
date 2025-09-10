// Types pour l'API YouTube IFrame Player

export interface YouTubePlayerVars {
  autoplay?: number;
  cc_load_policy?: number;
  color?: 'red' | 'white';
  controls?: number;
  disablekb?: number;
  enablejsapi?: number;
  end?: number;
  fs?: number;
  hl?: string;
  iv_load_policy?: number;
  list?: string;
  listType?: 'search' | 'user_uploads' | 'playlist';
  loop?: number;
  modestbranding?: number;
  origin?: string;
  playerapiid?: string;
  playlist?: string;
  playsinline?: number;
  rel?: number;
  showinfo?: number;
  start?: number;
  widget_referrer?: string;
}

export interface YouTubePlayerOptions {
  width?: string | number;
  height?: string | number;
  videoId?: string;
  playerVars?: YouTubePlayerVars;
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerStateChangeEvent) => void;
    onPlaybackQualityChange?: (event: YouTubePlayerEvent) => void;
    onPlaybackRateChange?: (event: YouTubePlayerEvent) => void;
    onError?: (event: YouTubePlayerErrorEvent) => void;
    onApiChange?: (event: YouTubePlayerEvent) => void;
  };
}

export interface YouTubePlayerEvent {
  target: YouTubePlayer;
}

export interface YouTubePlayerStateChangeEvent extends YouTubePlayerEvent {
  data: YouTubePlayerState;
}

export interface YouTubePlayerErrorEvent extends YouTubePlayerEvent {
  data: YouTubePlayerErrorCode;
}

export enum YouTubePlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}

export enum YouTubePlayerErrorCode {
  INVALID_PARAM = 2,
  HTML5_ERROR = 5,
  VIDEO_NOT_FOUND = 100,
  VIDEO_NOT_ALLOWED = 101,
  VIDEO_NOT_ALLOWED_IN_EMBEDDED_PLAYER = 150
}

export interface YouTubePlayer {
  // Lecture
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  clearVideo(): void;
  
  // Informations sur la vidéo
  getDuration(): number;
  getCurrentTime(): number;
  getVideoLoadedFraction(): number;
  getPlayerState(): YouTubePlayerState;
  getPlaybackRate(): number;
  getAvailablePlaybackRates(): number[];
  
  // Contrôle de la lecture
  setPlaybackRate(suggestedRate: number): void;
  setSize(width: number, height: number): void;
  
  // Volume
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  getVolume(): number;
  
  // Chargement de vidéos
  loadVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
  loadVideoByUrl(mediaContentUrl: string, startSeconds?: number, suggestedQuality?: string): void;
  cueVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void;
  cueVideoByUrl(mediaContentUrl: string, startSeconds?: number, suggestedQuality?: string): void;
  
  // Playlist
  nextVideo(): void;
  previousVideo(): void;
  getPlaylistIndex(): number;
  
  // Qualité
  getPlaybackQuality(): string;
  setPlaybackQuality(suggestedQuality: string): void;
  getAvailableQualityLevels(): string[];
  
  // Destruction
  destroy(): void;
  
  // Informations sur l'iframe
  getIframe(): HTMLIFrameElement;
  
  // Informations sur la vidéo
  getVideoUrl(): string;
  getVideoEmbedCode(): string;
  
  // Options d'affichage
  setLoop(loopPlaylists: boolean): void;
  setShuffle(shufflePlaylist: boolean): void;
}

// Types globaux pour l'API YouTube
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string | Element, options: YouTubePlayerOptions) => YouTubePlayer;
      PlayerState: typeof YouTubePlayerState;
      PlayerError: typeof YouTubePlayerErrorCode;
      ready: (callback: () => void) => void;
      loaded: boolean;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

// État du player pour notre service
export interface YouTubePlayerServiceState {
  isReady: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  state: YouTubePlayerState;
  error: YouTubePlayerErrorCode | null;
  videoId: string | null;
}

// Options pour charger une vidéo
export interface LoadVideoOptions {
  videoId: string;
  startSeconds?: number;
  suggestedQuality?: string;
  autoplay?: boolean;
}

// Configuration du service
export interface YouTubePlayerServiceConfig {
  width?: string | number;
  height?: string | number;
  playerVars?: YouTubePlayerVars;
}

export { };
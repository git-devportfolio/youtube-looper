import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YouTubePlayerService, extractYouTubeVideoId } from './core';

@Component({
  selector: 'app-test-youtube',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="test-container">
      <h2 class="test-title">Test YouTube Player Service</h2>
      
      <div class="test-section">
        <label class="test-label">URL YouTube:</label>
        <input 
          type="text" 
          [(ngModel)]="testUrl" 
          placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          class="test-input">
        <div class="button-group">
          <button (click)="loadVideo()" [disabled]="!isValidUrl" class="test-button primary" 
                  [class.disabled]="!isValidUrl">
            Charger Vidéo
          </button>
          <button (click)="initPlayer()" class="test-button secondary">
            Initialiser Player
          </button>
        </div>
      </div>

      <div class="test-section">
        <div class="button-group">
          <button (click)="play()" [disabled]="!canPlay" class="test-button success" 
                  [class.disabled]="!canPlay">▶ Play</button>
          <button (click)="pause()" [disabled]="!canPause" class="test-button warning" 
                  [class.disabled]="!canPause">⏸ Pause</button>
          <button (click)="seekTo(30)" [disabled]="!playerService.isReady()" class="test-button info" 
                  [class.disabled]="!playerService.isReady()">⏭ 30s</button>
        </div>
      </div>

      <!-- Zone pour le player YouTube -->
      <div id="youtube-player" class="youtube-player-container"></div>

      <!-- Informations de debug -->
      <div class="test-info-panel">
        <h3 class="test-subtitle">État du Service</h3>
        <ul class="test-info-list">
          <li><strong>API Ready:</strong> <span class="status" [class.success]="apiReady" [class.error]="!apiReady">{{ apiReady }}</span></li>
          <li><strong>Player Ready:</strong> <span class="status" [class.success]="playerService.isReady()" [class.error]="!playerService.isReady()">{{ playerService.isReady() }}</span></li>
          <li><strong>State:</strong> <span class="state-badge">{{ getStateName(playerService.state()) }}</span></li>
          <li><strong>Playing:</strong> <span class="status" [class.success]="playerService.isPlaying()">{{ playerService.isPlaying() }}</span></li>
          <li><strong>Paused:</strong> <span class="status" [class.warning]="playerService.isPaused()">{{ playerService.isPaused() }}</span></li>
          <li><strong>Current Time:</strong> <span class="time-display">{{ playerService.currentTime() | number:'1.1-1' }}s</span></li>
          <li><strong>Duration:</strong> <span class="time-display">{{ playerService.duration() | number:'1.0-0' }}s</span></li>
          <li><strong>Volume:</strong> <span class="volume-display">{{ playerService.volume() }}%</span></li>
          <li><strong>Video ID:</strong> <span class="video-id">{{ playerService.videoId() || 'Aucun' }}</span></li>
          <li><strong>Error:</strong> <span class="status" [class.error]="playerService.error()">{{ playerService.error() || 'Aucune' }}</span></li>
          <li><strong>URL Valide:</strong> <span class="status" [class.success]="isValidUrl" [class.error]="!isValidUrl">{{ isValidUrl }}</span></li>
          <li><strong>Video ID extrait:</strong> <span class="video-id">{{ extractedVideoId || 'Aucun' }}</span></li>
        </ul>
      </div>

      <div class="test-instructions">
        <h3 class="test-subtitle">Instructions de test</h3>
        <ol class="test-list">
          <li>Cliquer sur "Initialiser Player" pour créer l'instance YouTube</li>
          <li>Entrer une URL YouTube valide (ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ)</li>
          <li>Cliquer sur "Charger Vidéo"</li>
          <li>Utiliser les boutons Play/Pause/Seek pour tester les contrôles</li>
          <li>Observer les changements d'état en temps réel</li>
        </ol>
        <p class="test-note"><strong>URLs de test suggestions:</strong></p>
        <ul class="test-url-list">
          <li><code>https://www.youtube.com/watch?v=dQw4w9WgXcQ</code> (Rick Roll - publique)</li>
          <li><code>https://youtu.be/9bZkp7q19f0</code> (format court)</li>
          <li><code>https://www.youtube.com/watch?v=INVALID123</code> (vidéo invalide pour tester l'erreur)</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .test-container {
      padding: var(--spacing-lg);
      color: var(--text-primary);
      background-color: var(--background-primary);
      border-radius: var(--border-radius-lg);
      max-width: 800px;
      margin: 0 auto;
    }

    .test-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-lg);
      text-align: center;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: var(--spacing-md);
    }

    .test-subtitle {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 var(--spacing-md);
    }

    .test-section {
      margin-bottom: var(--spacing-xl);
    }

    .test-label {
      display: block;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: var(--spacing-xs);
    }

    .test-input {
      width: 100%;
      max-width: 500px;
      padding: var(--spacing-sm) var(--spacing-md);
      border: 2px solid var(--border-color);
      border-radius: var(--border-radius);
      background-color: var(--background-secondary);
      color: var(--text-primary);
      font-size: 0.875rem;
      margin-bottom: var(--spacing-md);
      transition: border-color 0.2s ease;
    }

    .test-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(255, 0, 0, 0.2);
    }

    .button-group {
      display: flex;
      gap: var(--spacing-md);
      flex-wrap: wrap;
      align-items: center;
    }

    .test-button {
      padding: var(--spacing-sm) var(--spacing-lg);
      border: none;
      border-radius: var(--border-radius);
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 120px;
    }

    .test-button.primary {
      background-color: var(--primary-color);
      color: white;
    }

    .test-button.primary:hover:not(.disabled) {
      background-color: var(--primary-dark);
      transform: translateY(-1px);
    }

    .test-button.secondary {
      background-color: var(--secondary-color);
      color: white;
    }

    .test-button.secondary:hover:not(.disabled) {
      background-color: var(--secondary-dark);
      transform: translateY(-1px);
    }

    .test-button.success {
      background-color: #28a745;
      color: white;
    }

    .test-button.success:hover:not(.disabled) {
      background-color: #218838;
      transform: translateY(-1px);
    }

    .test-button.warning {
      background-color: #ffc107;
      color: #212529;
    }

    .test-button.warning:hover:not(.disabled) {
      background-color: #e0a800;
      transform: translateY(-1px);
    }

    .test-button.info {
      background-color: #17a2b8;
      color: white;
    }

    .test-button.info:hover:not(.disabled) {
      background-color: #138496;
      transform: translateY(-1px);
    }

    .test-button.disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }

    .youtube-player-container {
      width: 100%;
      max-width: 640px;
      height: 360px;
      background: #000;
      margin: var(--spacing-xl) auto;
      border-radius: var(--border-radius);
      border: 2px solid var(--border-color);
    }

    .test-info-panel {
      background-color: var(--background-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-lg);
      padding: var(--spacing-lg);
      margin: var(--spacing-xl) 0;
    }

    .test-info-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .test-info-list li {
      padding: var(--spacing-xs) 0;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .test-info-list li:last-child {
      border-bottom: none;
    }

    .status.success {
      color: #28a745;
      font-weight: 600;
    }

    .status.error {
      color: #dc3545;
      font-weight: 600;
    }

    .status.warning {
      color: #ffc107;
      font-weight: 600;
    }

    .state-badge {
      background-color: var(--primary-color);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .time-display, .volume-display {
      font-family: monospace;
      background-color: var(--background-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-primary);
    }

    .video-id {
      font-family: monospace;
      background-color: var(--background-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    .test-instructions {
      background-color: var(--background-secondary);
      border-left: 4px solid var(--primary-color);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      margin: var(--spacing-xl) 0;
    }

    .test-list, .test-url-list {
      color: var(--text-primary);
      padding-left: var(--spacing-lg);
    }

    .test-list li, .test-url-list li {
      margin-bottom: var(--spacing-xs);
      line-height: 1.5;
    }

    .test-note {
      font-weight: 600;
      color: var(--text-primary);
      margin: var(--spacing-md) 0 var(--spacing-sm) 0;
    }

    .test-url-list code {
      background-color: var(--background-tertiary);
      color: var(--text-primary);
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .test-container {
        padding: var(--spacing-md);
      }

      .button-group {
        flex-direction: column;
        align-items: stretch;
      }

      .test-button {
        min-width: auto;
      }

      .youtube-player-container {
        height: 240px;
      }

      .test-info-list li {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing-xs);
      }
    }
  `]
})
export class TestYouTubeComponent implements OnInit {
  protected readonly playerService = inject(YouTubePlayerService);
  private readonly destroyRef = inject(DestroyRef);

  testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  apiReady = false;

  get isValidUrl(): boolean {
    return extractYouTubeVideoId(this.testUrl) !== null;
  }

  get extractedVideoId(): string | null {
    return extractYouTubeVideoId(this.testUrl);
  }

  get canPlay(): boolean {
    return this.playerService.canPlay();
  }

  get canPause(): boolean {
    return this.playerService.canPause();
  }

  async ngOnInit() {
    // Vérifier si l'API YouTube est disponible
    this.checkApiStatus();
    
    // Vérifier périodiquement le statut de l'API
    const interval = setInterval(() => {
      this.checkApiStatus();
      if (this.apiReady) {
        clearInterval(interval);
      }
    }, 1000);

    // Nettoyer l'interval
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  private checkApiStatus() {
    this.apiReady = !!(window.YT && window.YT.Player);
  }

  async initPlayer() {
    try {
      debugger;
      console.log('Initialisation du player...');
      await this.playerService.initializePlayer('youtube-player', {
        width: 640,
        height: 360,
        playerVars: {
          controls: 1,
          modestbranding: 1,
          rel: 0
        }
      });
      console.log('Player initialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      alert('Erreur lors de l\'initialisation du player: ' + error);
    }
  }

  async loadVideo() {
    const videoId = extractYouTubeVideoId(this.testUrl);
    if (!videoId) {
      alert('URL YouTube invalide');
      return;
    }

    try {
      console.log('Chargement de la vidéo:', videoId);
      await this.playerService.loadVideo({
        videoId: videoId,
        autoplay: false
      });
      console.log('Vidéo chargée avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      alert('Erreur lors du chargement de la vidéo: ' + error);
    }
  }

  play() {
    console.log('Lecture...');
    this.playerService.play();
  }

  pause() {
    console.log('Pause...');
    this.playerService.pause();
  }

  seekTo(seconds: number) {
    console.log('Seek to:', seconds);
    this.playerService.seekTo(seconds);
  }

  getStateName(state: number): string {
    const stateNames: { [key: number]: string } = {
      '-1': 'UNSTARTED',
      '0': 'ENDED',
      '1': 'PLAYING',
      '2': 'PAUSED',
      '3': 'BUFFERING',
      '5': 'CUED'
    };
    return stateNames[state] || 'UNKNOWN';
  }
}
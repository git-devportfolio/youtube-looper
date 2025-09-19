import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { YouTubePlayerService } from '../../../../core/services/youtube-player.service';

// Interface pour les types de vitesse
export interface SpeedOption {
  value: number;
  label: string;
  preset: boolean;
}

// Configuration des vitesses disponibles
const SPEED_CONFIG = {
  presets: [0.45, 0.5, 0.70, 0.75, 1.0] as const,
  default: 1.0,
  storageKey: 'youtube-looper-speed'
} as const;

@Component({
  selector: 'app-speed-control',
  imports: [CommonModule],
  templateUrl: './speed-control.component.html',
  styleUrl: './speed-control.component.scss'
})
export class SpeedControlComponent implements OnInit {
  private readonly youTubePlayerService = inject(YouTubePlayerService);

  // Signals pour l'état du composant
  private readonly _currentSpeed = signal<number>(SPEED_CONFIG.default);

  // Propriétés publiques pour le template
  readonly presetSpeeds = [...SPEED_CONFIG.presets];

  // Signals computed pour l'interface
  readonly currentSpeed = this._currentSpeed.asReadonly();
  readonly canControlSpeed = computed(() => this.youTubePlayerService.isReady());

  readonly currentSpeedDisplay = computed(() => {
    const speed = this._currentSpeed();
    return `${speed}x`;
  });

  ngOnInit(): void {
    this.loadSpeedFromStorage();
    this.syncWithPlayer();
  }

  /**
   * Définit la vitesse de lecture
   */
  setSpeed(speed: number): void {
    if (!this.canControlSpeed()) {
      console.warn('Cannot set speed: player not ready');
      return;
    }

    try {
      this.youTubePlayerService.setPlaybackRate(speed);
      this._currentSpeed.set(speed);
      this.saveSpeedToStorage(speed);
      console.log(`Speed set to: ${speed}x`);
    } catch (error) {
      console.error('Error setting playback speed:', error);
    }
  }


  /**
   * Charge la vitesse sauvegardée depuis localStorage
   */
  private loadSpeedFromStorage(): void {
    try {
      const savedSpeed = localStorage.getItem(SPEED_CONFIG.storageKey);
      if (savedSpeed) {
        const speed = parseFloat(savedSpeed);
        if (!isNaN(speed) && speed > 0) {
          this._currentSpeed.set(speed);
          console.log(`Loaded speed from storage: ${speed}x`);
        }
      }
    } catch (error) {
      console.warn('Failed to load speed from localStorage:', error);
    }
  }

  /**
   * Sauvegarde la vitesse dans localStorage
   */
  private saveSpeedToStorage(speed: number): void {
    try {
      localStorage.setItem(SPEED_CONFIG.storageKey, speed.toString());
    } catch (error) {
      console.warn('Failed to save speed to localStorage:', error);
    }
  }

  /**
   * Synchronise avec l'état du lecteur YouTube
   */
  private syncWithPlayer(): void {
    // Écouter les changements d'état du player pour synchroniser la vitesse
    // Cette logique pourra être étendue si le YouTubePlayerService expose des événements
    if (this.youTubePlayerService.isReady()) {
      const currentPlayerRate = this.youTubePlayerService.playbackRate();
      if (currentPlayerRate !== this._currentSpeed()) {
        this._currentSpeed.set(currentPlayerRate);
      }
    }
  }
}

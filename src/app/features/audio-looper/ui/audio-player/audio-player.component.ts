import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPlayerService } from '../../services';

@Component({
  selector: 'app-audio-player',
  imports: [CommonModule],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss'
})
export class AudioPlayerComponent {
  private readonly audioPlayerService = inject(AudioPlayerService);

  // Signals du service
  readonly isPlaying = this.audioPlayerService.isPlaying;
  readonly isReady = this.audioPlayerService.isReady;
  readonly currentTime = this.audioPlayerService.currentTime;
  readonly duration = this.audioPlayerService.duration;

  // Computed pour l'affichage des temps au format MM:SS
  readonly formattedCurrentTime = computed(() => this.formatTime(this.currentTime()));
  readonly formattedDuration = computed(() => this.formatTime(this.duration()));

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
   * Formate le temps en MM:SS
   */
  private formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) {
      return '00:00';
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

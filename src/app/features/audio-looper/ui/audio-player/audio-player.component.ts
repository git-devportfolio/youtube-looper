import { Component, inject, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPlayerService, ToneEngineService, RubberbandEngineService } from '../../services';
import { AudioControlsModalComponent } from '../audio-controls-modal';

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

  @ViewChild(AudioControlsModalComponent) audioControlsModal?: AudioControlsModalComponent;

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

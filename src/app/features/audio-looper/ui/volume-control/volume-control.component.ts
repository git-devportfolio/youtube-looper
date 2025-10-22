import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioPlayerService } from '../../services';

@Component({
  selector: 'app-volume-control',
  imports: [CommonModule],
  templateUrl: './volume-control.component.html',
  styleUrl: './volume-control.component.scss'
})
export class VolumeControlComponent {
  private readonly audioPlayerService = inject(AudioPlayerService);

  // Signals
  readonly volume = this.audioPlayerService.volume;
  readonly isMuted = this.audioPlayerService.isMuted;
  readonly isReady = this.audioPlayerService.isReady;

  /**
   * Ajuste le volume (0-100)
   */
  onVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const volume = Number(input.value);
    this.audioPlayerService.setVolume(volume);
  }

  /**
   * Toggle mute/unmute
   */
  toggleMute(): void {
    this.audioPlayerService.toggleMute();
  }
}

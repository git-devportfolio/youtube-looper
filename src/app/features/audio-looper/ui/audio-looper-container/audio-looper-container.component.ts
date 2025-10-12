import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadComponent } from '../file-upload';
import { WaveformDisplayComponent } from '../waveform-display';
import { AudioPlayerService, ToneEngineService, WaveformService } from '../../services';

@Component({
  selector: 'app-audio-looper-container',
  imports: [CommonModule, FileUploadComponent, WaveformDisplayComponent],
  templateUrl: './audio-looper-container.component.html',
  styleUrl: './audio-looper-container.component.scss'
})
export class AudioLooperContainerComponent {
  private readonly audioPlayerService = inject(AudioPlayerService);
  private readonly toneEngineService = inject(ToneEngineService);
  private readonly waveformService = inject(WaveformService);

  // Signal pour l'AudioBuffer
  readonly audioBuffer = signal<AudioBuffer | null>(null);

  // Signals du service audio
  readonly isReady = this.audioPlayerService.isReady;

  /**
   * Gère la sélection d'un fichier audio
   */
  async onFileSelected(file: File): Promise<void> {
    try {
      console.log('Fichier sélectionné:', file.name);

      // Charger le fichier audio
      await this.audioPlayerService.loadAudioFile(file);
      console.log('Fichier chargé avec succès !');

      // Récupérer l'AudioBuffer de Tone.js pour la waveform
      const player = (this.toneEngineService as any).player;
      if (player && player.buffer) {
        const buffer = player.buffer.get() as AudioBuffer;
        this.audioBuffer.set(buffer);
        console.log('AudioBuffer récupéré pour la waveform');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du fichier:', error);
    }
  }
}

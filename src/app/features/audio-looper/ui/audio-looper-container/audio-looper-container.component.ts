import { Component, inject } from '@angular/core';
import { FileUploadComponent } from '../file-upload';
import { AudioPlayerService } from '../../services';

@Component({
  selector: 'app-audio-looper-container',
  imports: [FileUploadComponent],
  templateUrl: './audio-looper-container.component.html',
  styleUrl: './audio-looper-container.component.scss'
})
export class AudioLooperContainerComponent {
  private readonly audioPlayerService = inject(AudioPlayerService);

  /**
   * Gère la sélection d'un fichier audio
   */
  async onFileSelected(file: File): Promise<void> {
    try {
      console.log('Fichier sélectionné:', file.name);
      await this.audioPlayerService.loadAudioFile(file);
      console.log('Fichier chargé avec succès !');
    } catch (error) {
      console.error('Erreur lors du chargement du fichier:', error);
    }
  }
}

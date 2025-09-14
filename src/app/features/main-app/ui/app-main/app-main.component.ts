import { Component, ViewChild } from '@angular/core';
import { UrlInputComponent } from '../../../youtube';
import { VideoPlayerComponent } from '../../../video-player';
import { TimelineComponent } from '../../../video-controls';
import { YouTubeUrlInfo } from '../../../../core';

@Component({
  selector: 'app-main',
  imports: [UrlInputComponent, VideoPlayerComponent, TimelineComponent],
  templateUrl: './app-main.component.html',
  styleUrl: './app-main.component.scss'
})
export class AppMainComponent {
  @ViewChild('videoPlayer') videoPlayer!: VideoPlayerComponent;

  // Handlers pour le composant UrlInputComponent
  async onValidUrlSubmitted(urlInfo: YouTubeUrlInfo) {
    console.log('URL valide soumise:', urlInfo);
    
    try {
      // Charger la vidéo automatiquement via le VideoPlayerComponent
      console.log('Chargement automatique de la vidéo:', urlInfo.videoId);
      await this.videoPlayer.loadVideo(urlInfo.videoId, false);
      
      // Si un startTime est spécifié, naviguer à cette position
      if (urlInfo.startTime && urlInfo.startTime > 0) {
        setTimeout(() => {
          this.videoPlayer.seekTo(urlInfo.startTime!);
        }, 1000); // Attendre que la vidéo soit chargée
      }
      
      console.log('Vidéo chargée avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement automatique:', error);
    }
  }

  onUrlChanged(url: string) {
    console.log('URL changée:', url);
  }

  onUrlCleared() {
    console.log('URL effacée');
  }
}

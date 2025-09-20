import { Component, ViewChild, ElementRef, signal } from '@angular/core';
import { UrlInputComponent } from '../../../youtube';
import { VideoPlayerComponent } from '../../../video-player';
import { TimelineComponent } from '../../../video-controls';
import { LoopControlsComponent } from '../../../loop';
import { SpeedControlComponent } from '../../../player';
import { YouTubeUrlInfo } from '../../../../core';

@Component({
  selector: 'app-main',
  imports: [UrlInputComponent, VideoPlayerComponent, TimelineComponent, LoopControlsComponent, SpeedControlComponent],
  templateUrl: './app-main.component.html',
  styleUrl: './app-main.component.scss'
})
export class AppMainComponent {
  @ViewChild('videoPlayer') videoPlayer!: VideoPlayerComponent;
  @ViewChild('playerZone') playerZone!: ElementRef<HTMLDivElement>;

  // Signal pour tracker si une URL valide a été chargée
  hasValidUrl = signal(false);

  // Handlers pour le composant UrlInputComponent
  async onValidUrlSubmitted(urlInfo: YouTubeUrlInfo) {
    console.log('URL valide soumise:', urlInfo);

    try {
      // Charger la vidéo automatiquement via le VideoPlayerComponent
      console.log('Chargement automatique de la vidéo:', urlInfo.videoId);
      await this.videoPlayer.loadVideo(urlInfo.videoId, false);

      // Marquer qu'une URL valide a été chargée
      this.hasValidUrl.set(true);

      // Scroll automatique vers le lecteur vidéo
      // this.scrollToPlayer();

      // Si un startTime est spécifié, naviguer à cette position
      if (urlInfo.startTime && urlInfo.startTime > 0) {
        setTimeout(() => {
          this.videoPlayer.seekTo(urlInfo.startTime!);
        }, 1500); // Attendre que la vidéo soit chargée
      }

      console.log('Vidéo chargée avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement automatique:', error);
      // En cas d'erreur, ne pas afficher les contrôles
      this.hasValidUrl.set(false);
    }
  }

  onUrlChanged(url: string) {
    console.log('URL changée:', url);
    // Si l'URL change, cacher les contrôles jusqu'à la prochaine validation
    if (!url.trim()) {
      this.hasValidUrl.set(false);
    }
  }

  onUrlCleared() {
    console.log('URL effacée');
    // Quand l'URL est effacée, cacher les contrôles
    this.hasValidUrl.set(false);
  }

  private scrollToPlayer(): void {
    // Attendre un court délai pour s'assurer que le DOM est mis à jour
    setTimeout(() => {
      if (this.playerZone?.nativeElement) {
        this.playerZone.nativeElement.scrollIntoView(true);
      }
    }, 500);
  }
}

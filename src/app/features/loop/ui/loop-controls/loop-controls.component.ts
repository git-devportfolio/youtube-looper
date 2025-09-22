import { Component, inject, computed } from '@angular/core';
import { LoopService } from '../../../../core/services/loop.service';
import { YouTubePlayerService } from '../../../../core/services/youtube-player.service';

@Component({
  selector: 'app-loop-controls',
  imports: [],
  templateUrl: './loop-controls.component.html',
  styleUrl: './loop-controls.component.scss'
})
export class LoopControlsComponent {
  private readonly loopService = inject(LoopService);
  private readonly youTubePlayerService = inject(YouTubePlayerService);

  // Signals computed pour l'état de l'interface
  readonly isLoopActive = this.loopService.isLoopActive;
  readonly hasValidLoop = this.loopService.hasValidLoop;
  readonly canSetLoop = computed(() => this.youTubePlayerService.isReady());

  // État du bouton toggle loop
  readonly toggleLoopButtonText = computed(() =>
    this.isLoopActive() ? 'Stop' : 'Loop'
  );

  // readonly toggleLoopButtonIcon = computed(() =>
  //   this.isLoopActive() ? '⏸️' : '▶️'
  // );

  /**
   * Définit le temps de début de la boucle à la position actuelle
   */
  onSetStart(): void {
    const currentTime = this.youTubePlayerService.currentTime();
    this.loopService.setStartTime(currentTime);

    // Repositionner automatiquement la vidéo sur la position de début
    this.youTubePlayerService.seekTo(currentTime);

    console.log(`Set start time: ${currentTime}s`);
  }

  /**
   * Définit le temps de fin de la boucle à la position actuelle
   * et démarre automatiquement la loop
   */
  onSetEnd(): void {
    const currentTime = this.youTubePlayerService.currentTime();
    this.loopService.setEndTime(currentTime);

    console.log(`Set end time: ${currentTime}s`);

    // Démarrer automatiquement la loop si elle est valide
    if (this.hasValidLoop() && !this.isLoopActive()) {
      this.onToggleLoop();
    }
  }

  /**
   * Active/désactive la boucle avec logique de lecture intelligente
   */
  onToggleLoop(): void {
    if (!this.hasValidLoop()) {
      console.warn('Cannot toggle loop: invalid loop configuration');
      return;
    }

    const wasActive = this.isLoopActive();

    if (!wasActive) {
      // Activer la boucle et démarrer la lecture depuis le startTime
      const startTime = this.loopService.startTime();
      this.youTubePlayerService.seekTo(startTime);
      this.loopService.activateLoop();

      // Lancer la lecture si elle n'est pas déjà en cours
      if (!this.youTubePlayerService.isPlaying()) {
        this.youTubePlayerService.play();
      }

      console.log(`Loop activated and playback started from ${startTime}s`);
    } else {
      // Désactiver la boucle et arrêter la lecture
      this.loopService.deactivateLoop();
      this.youTubePlayerService.pause();
      console.log('Loop deactivated and playback stopped');
    }
  }
}

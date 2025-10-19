import { Component, inject } from '@angular/core';
import { ToneEngineService } from '../../services/tone-engine.service';
import { RubberbandEngineService } from '../../services/rubberband-engine.service';

/**
 * Composant de contrôle du pitch avec Rubberband
 *
 * Permet de modifier la tonalité de l'audio sans affecter la vitesse
 * via un slider de -6 à +6 demi-tons
 */
@Component({
  selector: 'app-rubberband-pitch-control',
  imports: [],
  templateUrl: './rubberband-pitch-control.component.html',
  styleUrl: './rubberband-pitch-control.component.scss'
})
export class RubberbandPitchControlComponent {
  // Injection des services
  private readonly toneEngine = inject(ToneEngineService);
  protected readonly rubberbandEngine = inject(RubberbandEngineService);

  // Plage du slider
  readonly MIN_PITCH = -6;
  readonly MAX_PITCH = 6;

  /**
   * Gère le changement de pitch depuis le slider
   * @param event Événement du slider
   */
  onPitchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const pitch = parseInt(input.value, 10);

    // Valider la plage
    if (pitch >= this.MIN_PITCH && pitch <= this.MAX_PITCH) {
      // Appeler ToneEngineService pour mettre à jour le pitch
      this.toneEngine.setPitch(pitch);

      // Le ToneEngineService va gérer la mise à jour du signal
      // et RubberbandEngineService va traiter l'audio
    }
  }

  /**
   * Réinitialise le pitch à 0
   */
  resetPitch(): void {
    this.toneEngine.resetPitch();
  }

  /**
   * Récupère la valeur actuelle du pitch depuis le signal
   */
  get currentPitch(): number {
    return this.rubberbandEngine.pitch();
  }

  /**
   * Vérifie si un traitement est en cours
   */
  get isProcessing(): boolean {
    return this.rubberbandEngine.isProcessing();
  }

  /**
   * Récupère la progression du traitement
   */
  get processingProgress(): number {
    return this.rubberbandEngine.processingProgress();
  }

  /**
   * Récupère le statut du traitement
   */
  get processingStatus(): string {
    return this.rubberbandEngine.processingStatus();
  }
}

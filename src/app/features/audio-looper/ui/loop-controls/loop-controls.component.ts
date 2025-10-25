import { Component, inject, computed } from '@angular/core';
import { ToneEngineService } from '../../services/tone-engine.service';

@Component({
  selector: 'app-loop-controls',
  imports: [],
  templateUrl: './loop-controls.component.html',
  styleUrl: './loop-controls.component.scss'
})
export class LoopControlsComponent {
  private readonly toneEngine = inject(ToneEngineService);

  // Signals depuis ToneEngineService
  readonly loopStart = this.toneEngine.loopStart;
  readonly loopEnd = this.toneEngine.loopEnd;
  readonly isLooping = this.toneEngine.isLooping;
  readonly currentTime = this.toneEngine.currentTime;
  readonly duration = this.toneEngine.duration;

  // Computed signals pour l'UI
  readonly hasLoopPoints = computed(() =>
    this.loopStart() !== null && this.loopEnd() !== null
  );

  readonly loopButtonLabel = computed(() =>
    this.isLooping() ? 'Loop OFF' : 'Loop ON'
  );

  readonly canActivateLoop = computed(() =>
    this.hasLoopPoints() && !this.isLooping()
  );

  /**
   * Définit le point A (début de la boucle) à la position courante
   */
  setPointA(): void {
    const currentPos = this.currentTime();
    const endPoint = this.loopEnd();
    const dur = this.duration();

    // Validation : le temps doit être valide
    if (currentPos < 0 || currentPos >= dur) {
      console.warn('Position invalide pour le point A');
      return;
    }

    // Si le point B existe et que A >= B, ne rien faire
    if (endPoint !== null && currentPos >= endPoint) {
      console.warn('Le point A doit être avant le point B');
      return;
    }

    // Si pas de point B, utiliser la durée totale
    const effectiveEndPoint = endPoint ?? dur;

    // Appeler setLoopPoints avec les deux points
    this.toneEngine.setLoopPoints(currentPos, effectiveEndPoint);

    console.log(`Point A défini à ${currentPos.toFixed(2)}s`);
  }

  /**
   * Définit le point B (fin de la boucle) à la position courante
   */
  setPointB(): void {
    const currentPos = this.currentTime();
    const startPoint = this.loopStart();
    const dur = this.duration();

    // Validation : le temps doit être valide
    if (currentPos <= 0 || currentPos > dur) {
      console.warn('Position invalide pour le point B');
      return;
    }

    // Si le point A existe et que B <= A, ne rien faire
    if (startPoint !== null && currentPos <= startPoint) {
      console.warn('Le point B doit être après le point A');
      return;
    }

    // Si pas de point A, utiliser 0
    const effectiveStartPoint = startPoint ?? 0;

    // Appeler setLoopPoints avec les deux points
    this.toneEngine.setLoopPoints(effectiveStartPoint, currentPos);

    console.log(`Point B défini à ${currentPos.toFixed(2)}s`);
  }

  /**
   * Active ou désactive la boucle
   */
  toggleLoop(): void {
    if (!this.hasLoopPoints()) {
      console.warn('Définissez les points A et B avant d\'activer la boucle');
      return;
    }

    this.toneEngine.toggleLoop();
  }

  /**
   * Réinitialise les points de boucle
   */
  resetLoop(): void {
    this.toneEngine.resetLoop();
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

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RubberbandEngineService } from '../../services/rubberband-engine.service';
import { ToneEngineService } from '../../services/tone-engine.service';

/**
 * Composant de contrôle du pitch avec Rubberband
 *
 * Interface modernisée avec popup modale et stepper (+/-)
 * Inspirée du HelpGuideComponent pour une UX cohérente
 */
@Component({
  selector: 'app-rubberband-pitch-control',
  imports: [CommonModule],
  templateUrl: './rubberband-pitch-control.component.html',
  styleUrl: './rubberband-pitch-control.component.scss'
})
export class RubberbandPitchControlComponent {
  private readonly rubberbandEngine = inject(RubberbandEngineService);
  private readonly toneEngine = inject(ToneEngineService);

  // Signal pour l'ouverture/fermeture de la popup
  private readonly _isOpen = signal(false);
  readonly isOpen = this._isOpen.asReadonly();

  // Valeurs du pitch
  readonly MIN_PITCH = -6;
  readonly MAX_PITCH = 6;
  readonly currentPitch = this.rubberbandEngine.pitch;

  // États de processing
  readonly isProcessing = this.rubberbandEngine.isProcessing;
  readonly processingProgress = this.rubberbandEngine.processingProgress;
  readonly processingStatus = this.rubberbandEngine.processingStatus;
  readonly hasError = this.rubberbandEngine.hasError;
  readonly errorMessage = this.rubberbandEngine.errorMessage;

  // Computed
  readonly canDecrease = computed(() => this.currentPitch() > this.MIN_PITCH);
  readonly canIncrease = computed(() => this.currentPitch() < this.MAX_PITCH);
  readonly isAudioReady = this.toneEngine.isReady;
  readonly pitchLabel = computed(() => {
    const pitch = this.currentPitch();
    if (pitch === 0) return '±0 demi-tons';
    return pitch > 0 ? `+${pitch} demi-tons` : `${pitch} demi-tons`;
  });

  /**
   * Ouvrir la popup
   */
  open(): void {
    this._isOpen.set(true);
  }

  /**
   * Fermer la popup
   */
  close(): void {
    this._isOpen.set(false);
  }

  /**
   * Diminuer le pitch de 1 demi-ton
   */
  decreasePitch(): void {
    if (this.canDecrease() && !this.isProcessing()) {
      const newPitch = this.currentPitch() - 1;
      this.toneEngine.setPitch(newPitch);
    }
  }

  /**
   * Augmenter le pitch de 1 demi-ton
   */
  increasePitch(): void {
    if (this.canIncrease() && !this.isProcessing()) {
      const newPitch = this.currentPitch() + 1;
      this.toneEngine.setPitch(newPitch);
    }
  }

  /**
   * Réinitialiser le pitch à 0
   */
  resetPitch(): void {
    if (!this.isProcessing()) {
      this.toneEngine.resetPitch();
    }
  }

  /**
   * Définir directement le pitch (pour des presets futurs)
   */
  setPitch(value: number): void {
    if (value >= this.MIN_PITCH && value <= this.MAX_PITCH && !this.isProcessing()) {
      this.toneEngine.setPitch(value);
    }
  }
}

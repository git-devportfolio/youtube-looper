import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RubberbandEngineService } from '../../services/rubberband-engine.service';
import { ToneEngineService } from '../../services/tone-engine.service';

/**
 * Composant modal de contrôle audio (pitch et vitesse)
 *
 * Interface modernisée avec popup modale à 2 onglets :
 * - Onglet 1 : Contrôle du pitch (-6 à +6 demi-tons)
 * - Onglet 2 : Contrôle de la vitesse (0.5x, 0.75x, 1.0x)
 *
 * Les modifications sont appliquées uniquement au clic sur "Appliquer"
 * pour éviter le reprocessing audio multiple
 */
@Component({
  selector: 'app-audio-controls-modal',
  imports: [CommonModule],
  templateUrl: './audio-controls-modal.component.html',
  styleUrl: './audio-controls-modal.component.scss'
})
export class AudioControlsModalComponent {
  private readonly rubberbandEngine = inject(RubberbandEngineService);
  private readonly toneEngine = inject(ToneEngineService);

  // Signal pour l'ouverture/fermeture de la popup
  private readonly _isOpen = signal(false);
  readonly isOpen = this._isOpen.asReadonly();

  // Signal pour l'onglet actif ('pitch' | 'speed')
  private readonly _activeTab = signal<'pitch' | 'speed'>('pitch');
  readonly activeTab = this._activeTab.asReadonly();

  // Valeurs temporaires (avant application) - exposées pour le template
  readonly _tempPitch = signal(0);
  readonly _tempSpeed = signal(1.0);

  // Valeurs du pitch
  readonly MIN_PITCH = -6;
  readonly MAX_PITCH = 6;
  readonly currentPitch = this.rubberbandEngine.pitch;

  // Valeurs de vitesse
  readonly MIN_SPEED = 0.5;
  readonly MAX_SPEED = 2.0;
  readonly SPEED_STEP = 0.05;
  readonly currentSpeed = this.toneEngine.playbackRate;

  // États de processing
  readonly isProcessing = this.rubberbandEngine.isProcessing;
  readonly processingProgress = this.rubberbandEngine.processingProgress;
  readonly processingStatus = this.rubberbandEngine.processingStatus;
  readonly hasError = this.rubberbandEngine.hasError;
  readonly errorMessage = this.rubberbandEngine.errorMessage;

  // Computed
  readonly canDecreasePitch = computed(() => this._tempPitch() > this.MIN_PITCH);
  readonly canIncreasePitch = computed(() => this._tempPitch() < this.MAX_PITCH);
  readonly canDecreaseSpeed = computed(() => this._tempSpeed() > this.MIN_SPEED);
  readonly canIncreaseSpeed = computed(() => this._tempSpeed() < this.MAX_SPEED);
  readonly isAudioReady = this.toneEngine.isReady;

  readonly pitchLabel = computed(() => {
    const pitch = this.currentPitch();
    if (pitch === 0) return '±0';
    return pitch > 0 ? `+${pitch}` : `${pitch}`;
  });

  readonly tempPitchLabel = computed(() => {
    const pitch = this._tempPitch();
    if (pitch === 0) return '±0 demi-tons';
    return pitch > 0 ? `+${pitch} demi-tons` : `${pitch} demi-tons`;
  });

  readonly tempSpeedLabel = computed(() => {
    return `${this._tempSpeed().toFixed(2)}x`;
  });

  readonly hasChanges = computed(() => {
    return this._tempPitch() !== this.currentPitch() ||
           this._tempSpeed() !== this.currentSpeed();
  });

  /**
   * Ouvrir la popup
   */
  open(): void {
    // Initialiser les valeurs temporaires avec les valeurs actuelles
    this._tempPitch.set(this.currentPitch());
    this._tempSpeed.set(this.currentSpeed());
    this._isOpen.set(true);
  }

  /**
   * Fermer la popup sans appliquer
   */
  close(): void {
    this._isOpen.set(false);
  }

  /**
   * Changer d'onglet
   */
  setActiveTab(tab: 'pitch' | 'speed'): void {
    this._activeTab.set(tab);
  }

  /**
   * Diminuer le pitch temporaire de 1 demi-ton
   */
  decreaseTempPitch(): void {
    if (this.canDecreasePitch()) {
      this._tempPitch.update(p => p - 1);
    }
  }

  /**
   * Augmenter le pitch temporaire de 1 demi-ton
   */
  increaseTempPitch(): void {
    if (this.canIncreasePitch()) {
      this._tempPitch.update(p => p + 1);
    }
  }

  /**
   * Diminuer la vitesse temporaire de 0.05x
   */
  decreaseTempSpeed(): void {
    if (this.canDecreaseSpeed()) {
      this._tempSpeed.update(s => Math.max(this.MIN_SPEED, Number((s - this.SPEED_STEP).toFixed(2))));
    }
  }

  /**
   * Augmenter la vitesse temporaire de 0.05x
   */
  increaseTempSpeed(): void {
    if (this.canIncreaseSpeed()) {
      this._tempSpeed.update(s => Math.min(this.MAX_SPEED, Number((s + this.SPEED_STEP).toFixed(2))));
    }
  }

  /**
   * Réinitialiser le pitch temporaire à 0
   */
  resetTempPitch(): void {
    this._tempPitch.set(0);
  }

  /**
   * Réinitialiser la vitesse temporaire à 1.0
   */
  resetTempSpeed(): void {
    this._tempSpeed.set(1.0);
  }

  /**
   * Appliquer les modifications et fermer la popup
   * Déclenche le reprocessing audio avec les nouveaux paramètres
   */
  async apply(): Promise<void> {
    if (!this.hasChanges() || this.isProcessing()) {
      this.close();
      return;
    }

    debugger;
    // Appliquer les changements via ToneEngineService
    // qui déclenchera le reprocessing Rubberband si nécessaire
    if (this._tempPitch() !== this.currentPitch()) {
      this.toneEngine.setPitch(this._tempPitch());
    }

    if (this._tempSpeed() !== this.currentSpeed()) {
      this.toneEngine.setPlaybackRate(this._tempSpeed());
    }

    this.close();
  }
}

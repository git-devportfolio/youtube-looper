import { Component, inject, computed } from '@angular/core';
import { ToneEngineService } from '../../services/tone-engine.service';

@Component({
  selector: 'app-speed-control',
  imports: [],
  templateUrl: './speed-control.component.html',
  styleUrl: './speed-control.component.scss'
})
export class SpeedControlComponent {
  private readonly toneEngine = inject(ToneEngineService);

  // Signal pour la vitesse actuelle depuis ToneEngineService
  readonly playbackRate = this.toneEngine.playbackRate;

  // Presets de vitesse disponibles
  readonly SPEED_PRESETS = [0.5, 0.75, 1.0] as const;

  // Computed signal pour vérifier si un preset est actif
  isPresetActive(speed: number): boolean {
    return this.playbackRate() === speed;
  }

  /**
   * Définit la vitesse de lecture
   */
  setSpeed(speed: number): void {
    this.toneEngine.setPlaybackRate(speed);
    console.log(`Vitesse définie à ${speed}x`);
  }
}

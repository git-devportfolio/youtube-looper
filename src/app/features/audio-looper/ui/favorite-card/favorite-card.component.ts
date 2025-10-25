import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoriteModel } from '../../data/interfaces';

/**
 * Composant carte minimaliste pour afficher un favori audio
 */
@Component({
  selector: 'app-favorite-card',
  imports: [CommonModule],
  templateUrl: './favorite-card.component.html',
  styleUrl: './favorite-card.component.scss'
})
export class FavoriteCardComponent {

  // Inputs
  readonly favorite = input.required<FavoriteModel>();
  readonly isEditMode = input<boolean>(false); // Mode édition pour réorganisation

  // Outputs
  readonly load = output<FavoriteModel>(); // Charger le favori dans le lecteur
  readonly play = output<FavoriteModel>(); // Démarrer la lecture
  readonly delete = output<string>();

  // Computed properties
  readonly hasActivePitch = computed(() => this.favorite().settings.pitch !== 0);
  readonly hasActiveSpeed = computed(() => this.favorite().settings.playbackRate !== 1.0);
  readonly hasActiveLoop = computed(() => this.favorite().settings.loopEnabled);

  readonly formattedDate = computed(() => {
    const date = new Date(this.favorite().timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  });

  readonly formattedSize = computed(() => {
    const sizeBytes = this.favorite().size;
    if (sizeBytes < 1024 * 1024) {
      return `${Math.round(sizeBytes / 1024)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  });

  readonly formattedDuration = computed(() => {
    const totalSeconds = Math.floor(this.favorite().duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  /**
   * Émets l'événement pour charger ce favori (clic sur la card)
   * Désactivé en mode édition
   */
  onCardClick(): void {
    if (this.isEditMode()) return; // Désactiver le clic en mode édition
    this.load.emit(this.favorite());
  }

  /**
   * Émets l'événement pour jouer ce favori
   */
  onPlay(event: Event): void {
    event.stopPropagation(); // Empêche le clic sur la card
    this.play.emit(this.favorite());
  }

  /**
   * Émets l'événement pour supprimer ce favori
   */
  onDelete(event: Event): void {
    event.stopPropagation(); // Empêche le clic sur la card
    this.delete.emit(this.favorite().id);
  }
}

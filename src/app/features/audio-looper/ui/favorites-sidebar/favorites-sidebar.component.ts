import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoriteCardComponent } from '../favorite-card';
import { FavoriteService } from '../../data/services';
import { FavoriteModel } from '../../data/interfaces';

/**
 * Composant sidebar coulissant pour afficher la liste des favoris audio
 */
@Component({
  selector: 'app-favorites-sidebar',
  imports: [CommonModule, FavoriteCardComponent],
  templateUrl: './favorites-sidebar.component.html',
  styleUrl: './favorites-sidebar.component.scss'
})
export class FavoritesSidebarComponent {
  private readonly favoriteService = inject(FavoriteService);

  // Inputs
  readonly isOpen = input<boolean>(false);
  readonly favoritesCount = input<number>(0);
  readonly maxFavorites = input<number>(10);
  readonly totalSize = input<number>(0);
  readonly maxSize = input<number>(100 * 1024 * 1024); // 100 MB

  // Outputs
  readonly close = output<void>();
  readonly uploadNewFile = output<void>();
  readonly editOrder = output<void>();
  readonly playFavorite = output<FavoriteModel>();

  // Computed values
  readonly sizeMB = computed(() => Math.round(this.totalSize() / (1024 * 1024)));
  readonly maxSizeMB = computed(() => Math.round(this.maxSize() / (1024 * 1024)));
  readonly usagePercentage = computed(() =>
    Math.round((this.totalSize() / this.maxSize()) * 100)
  );

  // Accès aux favoris depuis le service
  readonly favorites = this.favoriteService.favorites;

  /**
   * Ferme le sidebar
   */
  onClose(): void {
    this.close.emit();
  }

  /**
   * Ouvre le dialog d'upload de nouveau fichier
   */
  onUploadNewFile(): void {
    this.uploadNewFile.emit();
  }

  /**
   * Active le mode édition d'ordre
   */
  onEditOrder(): void {
    this.editOrder.emit();
  }

  /**
   * Gère le clic sur l'overlay pour fermer
   */
  onOverlayClick(): void {
    this.close.emit();
  }

  /**
   * Gère la lecture d'un favori
   */
  onPlayFavorite(favorite: FavoriteModel): void {
    this.playFavorite.emit(favorite);
  }

  /**
   * Gère la suppression d'un favori
   */
  async onDeleteFavorite(favoriteId: string): Promise<void> {
    // Demander confirmation
    const confirmed = confirm('Êtes-vous sûr de vouloir supprimer ce favori ?');
    if (!confirmed) return;

    // Supprimer le favori
    const success = await this.favoriteService.remove(favoriteId);

    if (!success) {
      alert('Erreur lors de la suppression du favori.');
    }
  }
}

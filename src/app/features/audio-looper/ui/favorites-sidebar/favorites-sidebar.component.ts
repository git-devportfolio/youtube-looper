import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { FavoriteCardComponent } from '../favorite-card';
import { FavoriteService } from '../../data/services';
import { FavoritesSidebarStateService } from '../../services';
import { FavoriteModel } from '../../data/interfaces';

/**
 * Composant sidebar coulissant pour afficher la liste des favoris audio
 */
@Component({
  selector: 'app-favorites-sidebar',
  imports: [CommonModule, FavoriteCardComponent, DragDropModule],
  templateUrl: './favorites-sidebar.component.html',
  styleUrl: './favorites-sidebar.component.scss'
})
export class FavoritesSidebarComponent {
  private readonly favoriteService = inject(FavoriteService);
  private readonly sidebarStateService = inject(FavoritesSidebarStateService);

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
  readonly loadFavorite = output<FavoriteModel>(); // Charger le favori
  readonly playFavorite = output<FavoriteModel>(); // Jouer le favori

  // Computed values
  readonly sizeMB = computed(() => Math.round(this.totalSize() / (1024 * 1024)));
  readonly maxSizeMB = computed(() => Math.round(this.maxSize() / (1024 * 1024)));
  readonly usagePercentage = computed(() =>
    Math.round((this.totalSize() / this.maxSize()) * 100)
  );

  // Accès aux favoris depuis le service
  readonly favorites = this.favoriteService.favorites;

  // Accès au signal isEditMode depuis le service
  readonly isEditMode = this.sidebarStateService.isEditMode;

  /**
   * Ferme le sidebar et désactive le mode édition
   */
  onClose(): void {
    this.sidebarStateService.exitEditMode();
    this.close.emit();
  }

  /**
   * Ouvre le dialog d'upload de nouveau fichier
   */
  onUploadNewFile(): void {
    this.uploadNewFile.emit();
  }

  /**
   * Bascule le mode édition d'ordre des favoris
   */
  onToggleEditMode(): void {
    this.sidebarStateService.toggleEditMode();
  }

  /**
   * Gère le clic sur l'overlay pour fermer
   */
  onOverlayClick(): void {
    this.close.emit();
  }

  /**
   * Gère le chargement d'un favori (clic sur la card)
   */
  onLoadFavorite(favorite: FavoriteModel): void {
    this.loadFavorite.emit(favorite);
  }

  /**
   * Gère la lecture d'un favori (bouton Play)
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

  /**
   * Gère le drag & drop pour réorganiser les favoris
   */
  async onDrop(event: CdkDragDrop<FavoriteModel[]>): Promise<void> {
    if (!this.isEditMode()) return;

    const favoritesList = this.favorites();

    // Calculer le nouvel ordre
    const newOrder = [...favoritesList];
    moveItemInArray(newOrder, event.previousIndex, event.currentIndex);

    // Extraire les IDs dans le nouvel ordre
    const newOrderIds = newOrder.map(f => f.id);

    // Sauvegarder le nouvel ordre via le service
    await this.favoriteService.reorder(newOrderIds);
  }
}

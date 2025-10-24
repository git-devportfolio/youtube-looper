import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoriteModel } from '../../data/interfaces';
import { FavoriteService } from '../../data';

@Component({
  selector: 'app-favorite-quota-modal',
  imports: [CommonModule],
  templateUrl: './favorite-quota-modal.component.html',
  styleUrl: './favorite-quota-modal.component.scss'
})
export class FavoriteQuotaModalComponent {
  private readonly favoriteService = inject(FavoriteService);

  // Input: indique si la modal est ouverte
  readonly isOpen = input.required<boolean>();

  // Output: événement de fermeture
  readonly close = output<void>();

  // Output: événement après suppression réussie (pour déclencher l'ajout automatique)
  readonly favoriteDeleted = output<void>();

  // Signals
  readonly favorites = this.favoriteService.favorites;
  readonly isDeleting = signal<string | null>(null); // ID du favori en cours de suppression

  /**
   * Ferme la modal
   */
  closeModal(): void {
    this.close.emit();
  }

  /**
   * Supprime un favori et émet un événement pour déclencher l'ajout automatique
   */
  async deleteFavorite(favoriteId: string): Promise<void> {
    if (this.isDeleting()) return;

    this.isDeleting.set(favoriteId);

    try {
      const success = await this.favoriteService.remove(favoriteId);

      if (success) {
        console.log('Favori supprimé avec succès, ID:', favoriteId);
        // Émettre l'événement pour déclencher l'ajout automatique
        this.favoriteDeleted.emit();
        // Fermer la modal automatiquement
        this.closeModal();
      } else {
        alert('Erreur lors de la suppression du favori');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du favori:', error);
      alert('Erreur lors de la suppression du favori');
    } finally {
      this.isDeleting.set(null);
    }
  }

  /**
   * Formate une taille en bytes vers une chaîne lisible (Ko/Mo)
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} o`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} Ko`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
    }
  }

  /**
   * Formate une durée en secondes vers une chaîne MM:SS
   */
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Formate une date ISO vers une chaîne lisible
   */
  formatDate(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

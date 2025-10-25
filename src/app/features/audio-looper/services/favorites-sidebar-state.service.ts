import { Injectable, signal } from '@angular/core';

/**
 * Service pour gérer l'état d'ouverture/fermeture du sidebar des favoris
 * Permet la communication entre module-nav et audio-looper-container
 */
@Injectable({
  providedIn: 'root'
})
export class FavoritesSidebarStateService {
  private readonly isOpenSignal = signal<boolean>(false);

  // API publique en lecture seule
  readonly isOpen = this.isOpenSignal.asReadonly();

  /**
   * Ouvre le sidebar
   */
  open(): void {
    this.isOpenSignal.set(true);
  }

  /**
   * Ferme le sidebar
   */
  close(): void {
    this.isOpenSignal.set(false);
  }

  /**
   * Toggle l'état du sidebar
   */
  toggle(): void {
    this.isOpenSignal.update(value => !value);
  }
}

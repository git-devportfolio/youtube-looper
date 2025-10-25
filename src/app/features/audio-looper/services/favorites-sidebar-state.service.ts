import { Injectable, signal } from '@angular/core';

/**
 * Service pour gérer l'état d'ouverture/fermeture du sidebar des favoris
 * et le mode édition pour la réorganisation des favoris
 * Permet la communication entre module-nav et audio-looper-container
 */
@Injectable({
  providedIn: 'root'
})
export class FavoritesSidebarStateService {
  private readonly isOpenSignal = signal<boolean>(false);
  private readonly isEditModeSignal = signal<boolean>(false);

  // API publique en lecture seule
  readonly isOpen = this.isOpenSignal.asReadonly();
  readonly isEditMode = this.isEditModeSignal.asReadonly();

  /**
   * Ouvre le sidebar
   */
  open(): void {
    this.isOpenSignal.set(true);
  }

  /**
   * Ferme le sidebar et désactive le mode édition
   */
  close(): void {
    this.isOpenSignal.set(false);
    this.isEditModeSignal.set(false);
  }

  /**
   * Toggle l'état du sidebar
   */
  toggle(): void {
    this.isOpenSignal.update(value => !value);
  }

  /**
   * Active le mode édition (réorganisation des favoris)
   */
  enterEditMode(): void {
    this.isEditModeSignal.set(true);
  }

  /**
   * Désactive le mode édition
   */
  exitEditMode(): void {
    this.isEditModeSignal.set(false);
  }

  /**
   * Toggle le mode édition
   */
  toggleEditMode(): void {
    this.isEditModeSignal.update(value => !value);
  }
}

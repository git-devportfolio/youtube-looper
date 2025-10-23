import { Injectable, signal, computed } from '@angular/core';
import {
  FavoriteModel,
  FavoriteSettings,
  ValidationResult,
  StorageStats,
  DEFAULT_FAVORITE_SETTINGS,
} from '../interfaces';
import { FavoriteStorageService } from './favorite-storage.service';

/**
 * Service métier principal pour la gestion des favoris audio
 * Orchestre les opérations CRUD et maintient l'état réactif avec signals
 */
@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  // Signals pour l'état réactif
  private readonly favoritesSignal = signal<FavoriteModel[]>([]);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly storageStatsSignal = signal<StorageStats>({
    currentCount: 0,
    totalSize: 0,
    availableSpace: 0,
    usagePercentage: 0,
  });

  // API publique en lecture seule
  readonly favorites = this.favoritesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly storageStats = this.storageStatsSignal.asReadonly();

  // Computed signals
  readonly hasFavorites = computed(() => this.favoritesSignal().length > 0);
  readonly canAddMore = computed(() => {
    const stats = this.storageStatsSignal();
    return stats.currentCount < 10 && stats.usagePercentage < 100;
  });

  constructor(private storageService: FavoriteStorageService) {
    this.loadFavorites();
  }

  /**
   * Charge tous les favoris depuis le stockage
   */
  async loadFavorites(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const favorites = await this.storageService.loadAll();
      // Trier par timestamp décroissant (plus récent en premier)
      favorites.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      this.favoritesSignal.set(favorites);
      await this.updateStorageStats();
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
      this.favoritesSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Ajoute un nouveau favori
   */
  async add(
    fileName: string,
    mimeType: string,
    audioData: string,
    size: number,
    duration: number,
    settings: Partial<FavoriteSettings> = {}
  ): Promise<ValidationResult> {
    const favorite: FavoriteModel = {
      id: this.generateUniqueId(),
      fileName,
      mimeType,
      audioData,
      size,
      duration,
      timestamp: new Date().toISOString(),
      settings: { ...DEFAULT_FAVORITE_SETTINGS, ...settings },
    };

    const result = await this.storageService.save(favorite);

    if (result.isValid) {
      await this.loadFavorites(); // Recharger la liste
    }

    return result;
  }

  /**
   * Supprime un favori
   */
  async remove(id: string): Promise<boolean> {
    const success = await this.storageService.remove(id);

    if (success) {
      await this.loadFavorites(); // Recharger la liste
    }

    return success;
  }

  /**
   * Met à jour les réglages d'un favori
   */
  async updateSettings(id: string, settings: Partial<FavoriteSettings>): Promise<ValidationResult> {
    const favorite = await this.storageService.load(id);

    if (!favorite) {
      return {
        isValid: false,
        errorMessage: 'Favori introuvable',
        errorCode: 'INVALID_FORMAT',
      };
    }

    favorite.settings = { ...favorite.settings, ...settings };
    const result = await this.storageService.save(favorite);

    if (result.isValid) {
      // Mise à jour locale sans recharger tout
      const favorites = this.favoritesSignal();
      const index = favorites.findIndex(f => f.id === id);
      if (index !== -1) {
        const updated = [...favorites];
        updated[index] = favorite;
        this.favoritesSignal.set(updated);
      }
    }

    return result;
  }

  /**
   * Récupère un favori par son ID
   */
  async getById(id: string): Promise<FavoriteModel | null> {
    return await this.storageService.load(id);
  }

  /**
   * Récupère la liste des favoris (synchrone depuis le signal)
   */
  list(): FavoriteModel[] {
    return this.favoritesSignal();
  }

  /**
   * Vérifie si un fichier existe déjà dans les favoris
   */
  hasFileByName(fileName: string): boolean {
    return this.favoritesSignal().some(f => f.fileName === fileName);
  }

  /**
   * Efface tous les favoris
   */
  async clearAll(): Promise<boolean> {
    const success = await this.storageService.clearAll();

    if (success) {
      this.favoritesSignal.set([]);
      await this.updateStorageStats();
    }

    return success;
  }

  /**
   * Met à jour les statistiques de stockage
   */
  private async updateStorageStats(): Promise<void> {
    const stats = await this.storageService.getStorageStats();
    this.storageStatsSignal.set(stats);
  }

  /**
   * Génère un ID unique basé sur timestamp et random
   */
  private generateUniqueId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `fav_${timestamp}_${random}`;
  }

  /**
   * Exporte un favori en tant que fichier JSON
   */
  exportFavorite(id: string): string | null {
    const favorite = this.favoritesSignal().find(f => f.id === id);
    return favorite ? JSON.stringify(favorite, null, 2) : null;
  }

  /**
   * Importe un favori depuis JSON
   */
  async importFavorite(jsonData: string): Promise<ValidationResult> {
    try {
      const favorite: FavoriteModel = JSON.parse(jsonData);

      // Générer un nouvel ID pour éviter les conflits
      favorite.id = this.generateUniqueId();
      favorite.timestamp = new Date().toISOString();

      const result = await this.storageService.save(favorite);

      if (result.isValid) {
        await this.loadFavorites();
      }

      return result;
    } catch (error) {
      console.error('Erreur lors de l\'import du favori:', error);
      return {
        isValid: false,
        errorMessage: 'Format JSON invalide',
        errorCode: 'INVALID_FORMAT',
      };
    }
  }
}

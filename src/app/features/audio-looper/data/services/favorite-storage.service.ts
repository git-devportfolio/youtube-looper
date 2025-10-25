import { Injectable } from '@angular/core';
import {
  FavoriteModel,
  StorageStats,
  ValidationResult,
  DEFAULT_STORAGE_CONFIG,
} from '../interfaces';

/**
 * Service de gestion du stockage des favoris audio
 * Utilise localStorage pour les métadonnées et IndexedDB pour les données audio
 */
@Injectable({
  providedIn: 'root',
})
export class FavoriteStorageService {
  private readonly STORAGE_KEY = 'audio-looper-favorites';
  private readonly DB_NAME = 'AudioLooperDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'favorites';

  private db: IDBDatabase | null = null;

  constructor() {
    this.initIndexedDB();
  }

  /**
   * Initialise la base de données IndexedDB
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Erreur lors de l\'ouverture de IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Créer l'object store si nécessaire
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Assure que la base de données est initialisée
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initIndexedDB();
    }
    if (!this.db) {
      throw new Error('IndexedDB non initialisée');
    }
    return this.db;
  }

  /**
   * Sauvegarde un favori dans le stockage
   */
  async save(favorite: FavoriteModel): Promise<ValidationResult> {
    try {
      // Validation des limites avant sauvegarde
      const validation = await this.validateLimits(favorite);
      if (!validation.isValid) {
        return validation;
      }

      // Sauvegarder dans IndexedDB
      const db = await this.ensureDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(favorite);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Mettre à jour les métadonnées dans localStorage
      await this.updateMetadata();

      return { isValid: true };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du favori:', error);
      return {
        isValid: false,
        errorMessage: 'Erreur lors de la sauvegarde du favori',
        errorCode: 'INVALID_FORMAT',
      };
    }
  }

  /**
   * Charge un favori depuis le stockage
   */
  async load(id: string): Promise<FavoriteModel | null> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Erreur lors du chargement du favori:', error);
      return null;
    }
  }

  /**
   * Charge tous les favoris en respectant l'ordre sauvegardé
   */
  async loadAll(): Promise<FavoriteModel[]> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      // Charger tous les favoris depuis IndexedDB
      const favorites = await new Promise<FavoriteModel[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      // Charger les métadonnées pour obtenir l'ordre
      const metadataStr = localStorage.getItem(this.STORAGE_KEY);
      if (metadataStr) {
        try {
          const metadata = JSON.parse(metadataStr);
          if (metadata.ids && Array.isArray(metadata.ids)) {
            // Trier les favoris selon l'ordre des IDs dans les métadonnées
            const orderedFavorites: FavoriteModel[] = [];
            for (const id of metadata.ids) {
              const favorite = favorites.find(f => f.id === id);
              if (favorite) {
                orderedFavorites.push(favorite);
              }
            }

            // Ajouter les favoris non présents dans les métadonnées (cas d'erreur)
            const missingFavorites = favorites.filter(f => !metadata.ids.includes(f.id));
            return [...orderedFavorites, ...missingFavorites];
          }
        } catch (error) {
          console.warn('Erreur lors de la lecture des métadonnées d\'ordre:', error);
        }
      }

      // Pas de métadonnées d'ordre : retourner les favoris tels quels
      return favorites;
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
      return [];
    }
  }

  /**
   * Supprime un favori du stockage
   */
  async remove(id: string): Promise<boolean> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Mettre à jour les métadonnées
      await this.updateMetadata();

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du favori:', error);
      return false;
    }
  }

  /**
   * Calcule la taille totale de tous les favoris
   */
  async calculateTotalSize(): Promise<number> {
    const favorites = await this.loadAll();
    return favorites.reduce((total, fav) => total + fav.size, 0);
  }

  /**
   * Récupère les statistiques de stockage
   */
  async getStorageStats(): Promise<StorageStats> {
    const favorites = await this.loadAll();
    const totalSize = favorites.reduce((sum, fav) => sum + fav.size, 0);
    const currentCount = favorites.length;
    const availableSpace = DEFAULT_STORAGE_CONFIG.maxTotalSize - totalSize;
    const usagePercentage = (totalSize / DEFAULT_STORAGE_CONFIG.maxTotalSize) * 100;

    return {
      currentCount,
      totalSize,
      availableSpace,
      usagePercentage: Math.round(usagePercentage * 100) / 100, // 2 décimales
    };
  }

  /**
   * Valide les limites de stockage avant d'ajouter un favori
   */
  async validateLimits(newFavorite: FavoriteModel): Promise<ValidationResult> {
    const favorites = await this.loadAll();

    // Vérifier si c'est une mise à jour (favori existant)
    const existingFavorite = favorites.find(f => f.id === newFavorite.id);
    const isUpdate = !!existingFavorite;

    // Nombre de favoris
    if (!isUpdate && favorites.length >= DEFAULT_STORAGE_CONFIG.maxFavorites) {
      return {
        isValid: false,
        errorMessage: `Limite de ${DEFAULT_STORAGE_CONFIG.maxFavorites} favoris atteinte`,
        errorCode: 'MAX_FAVORITES',
      };
    }

    // Vérifier les doublons de nom de fichier (sauf pour les mises à jour)
    if (!isUpdate) {
      const duplicate = favorites.find(f => f.fileName === newFavorite.fileName);
      if (duplicate) {
        return {
          isValid: false,
          errorMessage: `Un favori avec le nom "${newFavorite.fileName}" existe déjà`,
          errorCode: 'DUPLICATE_FILE',
        };
      }
    }

    // Taille totale
    const currentTotalSize = favorites
      .filter(f => f.id !== newFavorite.id) // Exclure l'ancien si c'est une mise à jour
      .reduce((sum, fav) => sum + fav.size, 0);

    const newTotalSize = currentTotalSize + newFavorite.size;

    if (newTotalSize > DEFAULT_STORAGE_CONFIG.maxTotalSize) {
      const maxSizeMB = Math.round(DEFAULT_STORAGE_CONFIG.maxTotalSize / (1024 * 1024));
      return {
        isValid: false,
        errorMessage: `Limite de stockage de ${maxSizeMB} MB dépassée`,
        errorCode: 'MAX_SIZE',
      };
    }

    return { isValid: true };
  }

  /**
   * Met à jour les métadonnées dans localStorage
   */
  private async updateMetadata(): Promise<void> {
    const favorites = await this.loadAll();
    const metadata = {
      count: favorites.length,
      lastUpdated: new Date().toISOString(),
      ids: favorites.map(f => f.id),
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));
  }

  /**
   * Efface toutes les données de stockage
   */
  async clearAll(): Promise<boolean> {
    try {
      const db = await this.ensureDB();
      const transaction = db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      localStorage.removeItem(this.STORAGE_KEY);

      return true;
    } catch (error) {
      console.error('Erreur lors de l\'effacement des favoris:', error);
      return false;
    }
  }

  /**
   * Réorganise tous les favoris selon un nouvel ordre
   * @param orderedFavorites Tableau de favoris dans le nouvel ordre
   * @returns Promise<boolean> True si la réorganisation a réussi
   */
  async reorderAll(orderedFavorites: FavoriteModel[]): Promise<boolean> {
    try {
      // Sauvegarder les métadonnées avec le nouvel ordre des IDs
      const metadata = {
        count: orderedFavorites.length,
        lastUpdated: new Date().toISOString(),
        ids: orderedFavorites.map(f => f.id), // L'ordre est important ici
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(metadata));

      console.log('Ordre des favoris sauvegardé dans localStorage:', metadata.ids);
      return true;
    } catch (error) {
      console.error('Erreur lors de la réorganisation des favoris:', error);
      return false;
    }
  }
}

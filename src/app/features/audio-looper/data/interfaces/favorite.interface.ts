/**
 * Configuration des favoris audio avec les réglages de lecture
 */
export interface FavoriteSettings {
  /** Modification de la tonalité en demi-tons (-6 à +6) */
  pitch: number;
  /** Vitesse de lecture (0.5, 0.75, 1.0) */
  playbackRate: number;
  /** Position courante de lecture en secondes */
  currentTime: number;
  /** Point de début de la boucle A/B en secondes */
  loopStart: number | null;
  /** Point de fin de la boucle A/B en secondes */
  loopEnd: number | null;
  /** État d'activation de la boucle A/B */
  loopEnabled: boolean;
  /** Volume de lecture (0 à 1) */
  volume: number;
  /** État du mode muet */
  isMuted: boolean;
}

/**
 * Modèle de données pour un favori audio
 */
export interface FavoriteModel {
  /** Identifiant unique du favori (UUID v4) */
  id: string;
  /** Nom du fichier audio original */
  fileName: string;
  /** Type MIME du fichier audio */
  mimeType: string;
  /** Données audio encodées en Base64 */
  audioData: string;
  /** Configuration des réglages de lecture */
  settings: FavoriteSettings;
  /** Timestamp de création (ISO 8601) */
  timestamp: string;
  /** Taille du fichier en octets */
  size: number;
  /** Durée totale de l'audio en secondes */
  duration: number;
}

/**
 * Configuration des limites de stockage
 */
export interface StorageConfig {
  /** Nombre maximum de favoris autorisés */
  maxFavorites: number;
  /** Taille maximale totale en octets (100 MB = 100 * 1024 * 1024) */
  maxTotalSize: number;
}

/**
 * Statistiques d'utilisation du stockage
 */
export interface StorageStats {
  /** Nombre de favoris actuellement stockés */
  currentCount: number;
  /** Taille totale utilisée en octets */
  totalSize: number;
  /** Espace disponible en octets */
  availableSpace: number;
  /** Pourcentage d'utilisation (0-100) */
  usagePercentage: number;
}

/**
 * Résultat d'une opération de validation
 */
export interface ValidationResult {
  /** Indique si la validation a réussi */
  isValid: boolean;
  /** Message d'erreur si la validation échoue */
  errorMessage?: string;
  /** Code d'erreur pour identification programmatique */
  errorCode?: 'MAX_FAVORITES' | 'MAX_SIZE' | 'INVALID_FORMAT' | 'DUPLICATE_FILE' | 'QUOTA_EXCEEDED' | 'CORRUPTED_DATA' | 'STORAGE_ERROR';
  /** ID du favori créé/modifié (optionnel, disponible après add/update) */
  favoriteId?: string;
}

/**
 * Configuration par défaut du stockage
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  maxFavorites: 10,
  maxTotalSize: 100 * 1024 * 1024, // 100 MB
};

/**
 * Réglages par défaut pour un nouveau favori
 */
export const DEFAULT_FAVORITE_SETTINGS: FavoriteSettings = {
  pitch: 0,
  playbackRate: 1.0,
  currentTime: 0,
  loopStart: null,
  loopEnd: null,
  loopEnabled: false,
  volume: 1.0,
  isMuted: false,
};

import { ValidationResult, DEFAULT_STORAGE_CONFIG } from '../data/interfaces';

/**
 * Formats supportés pour les fichiers audio
 */
export const SUPPORTED_AUDIO_FORMATS = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];

/**
 * Extensions de fichiers supportées
 */
export const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];

/**
 * Taille maximale d'un fichier individuel (10 MB)
 */
export const MAX_INDIVIDUAL_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Valide la taille d'un fichier audio
 */
export function validateFileSize(fileSize: number): ValidationResult {
  if (fileSize <= 0) {
    return {
      isValid: false,
      errorMessage: 'La taille du fichier doit être supérieure à 0',
      errorCode: 'INVALID_FORMAT',
    };
  }

  if (fileSize > MAX_INDIVIDUAL_FILE_SIZE) {
    const maxSizeMB = Math.round(MAX_INDIVIDUAL_FILE_SIZE / (1024 * 1024));
    return {
      isValid: false,
      errorMessage: `Le fichier dépasse la taille maximale de ${maxSizeMB} MB`,
      errorCode: 'MAX_SIZE',
    };
  }

  return { isValid: true };
}

/**
 * Valide le type MIME d'un fichier audio
 */
export function validateMimeType(mimeType: string): ValidationResult {
  if (!mimeType) {
    return {
      isValid: false,
      errorMessage: 'Type de fichier non spécifié',
      errorCode: 'INVALID_FORMAT',
    };
  }

  if (!SUPPORTED_AUDIO_FORMATS.includes(mimeType)) {
    return {
      isValid: false,
      errorMessage: `Format non supporté. Formats acceptés: ${SUPPORTED_AUDIO_EXTENSIONS.join(', ')}`,
      errorCode: 'INVALID_FORMAT',
    };
  }

  return { isValid: true };
}

/**
 * Valide le nom d'un fichier
 */
export function validateFileName(fileName: string): ValidationResult {
  if (!fileName || fileName.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'Le nom du fichier ne peut pas être vide',
      errorCode: 'INVALID_FORMAT',
    };
  }

  // Vérifier l'extension
  const hasValidExtension = SUPPORTED_AUDIO_EXTENSIONS.some(ext =>
    fileName.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      isValid: false,
      errorMessage: `Extension de fichier non supportée. Extensions acceptées: ${SUPPORTED_AUDIO_EXTENSIONS.join(', ')}`,
      errorCode: 'INVALID_FORMAT',
    };
  }

  return { isValid: true };
}

/**
 * Valide la limite du nombre de favoris
 */
export function validateFavoriteLimit(currentCount: number): ValidationResult {
  if (currentCount >= DEFAULT_STORAGE_CONFIG.maxFavorites) {
    return {
      isValid: false,
      errorMessage: `Limite de ${DEFAULT_STORAGE_CONFIG.maxFavorites} favoris atteinte`,
      errorCode: 'MAX_FAVORITES',
    };
  }

  return { isValid: true };
}

/**
 * Valide la limite de stockage total
 */
export function validateTotalStorageLimit(
  currentTotalSize: number,
  newFileSize: number
): ValidationResult {
  const newTotal = currentTotalSize + newFileSize;

  if (newTotal > DEFAULT_STORAGE_CONFIG.maxTotalSize) {
    const maxSizeMB = Math.round(DEFAULT_STORAGE_CONFIG.maxTotalSize / (1024 * 1024));
    const currentSizeMB = Math.round(currentTotalSize / (1024 * 1024));
    return {
      isValid: false,
      errorMessage: `Limite de stockage de ${maxSizeMB} MB dépassée (actuellement: ${currentSizeMB} MB)`,
      errorCode: 'MAX_SIZE',
    };
  }

  return { isValid: true };
}

/**
 * Formate une taille de fichier en une chaîne lisible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(2)} ${sizes[i]}`;
}

/**
 * Formate une durée en secondes au format MM:SS
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Génère un ID unique pour un favori
 */
export function generateUniqueId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `fav_${timestamp}_${random}`;
}

/**
 * Convertit un fichier audio en Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Extraire uniquement la partie base64 (sans le prefix data:audio/...;base64,)
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convertit une chaîne Base64 en Blob
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Récupère la durée d'un fichier audio
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erreur lors de la lecture des métadonnées audio'));
    };

    audio.src = url;
  });
}

/**
 * Valide un fichier audio complet
 */
export async function validateAudioFile(file: File): Promise<ValidationResult> {
  // Valider le nom
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) {
    return nameValidation;
  }

  // Valider le type MIME
  const mimeValidation = validateMimeType(file.type);
  if (!mimeValidation.isValid) {
    return mimeValidation;
  }

  // Valider la taille
  const sizeValidation = validateFileSize(file.size);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return { isValid: true };
}

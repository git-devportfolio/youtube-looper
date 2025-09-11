import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { extractYouTubeVideoId, isValidYouTubeUrl } from '../utils';

/**
 * Validateur Angular pour les URLs YouTube
 */
export function youtubeUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Ne pas valider si le champ est vide (utiliser required séparément)
    }

    const value = control.value.trim();
    if (!value) {
      return null;
    }

    // Vérifier si l'URL est valide
    if (!isValidYouTubeUrl(value)) {
      return {
        youtubeUrl: {
          message: 'URL YouTube invalide',
          actualValue: value
        }
      };
    }

    return null;
  };
}

/**
 * Validateur pour extraire et valider l'ID de la vidéo YouTube
 */
export function youtubeVideoIdValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }

    const value = control.value.trim();
    if (!value) {
      return null;
    }

    const videoId = extractYouTubeVideoId(value);
    
    if (!videoId) {
      return {
        youtubeVideoId: {
          message: 'Impossible d\'extraire l\'ID de la vidéo YouTube',
          actualValue: value
        }
      };
    }

    // Validation supplémentaire de la longueur de l'ID
    if (videoId.length !== 11) {
      return {
        youtubeVideoId: {
          message: 'L\'ID de la vidéo YouTube doit faire 11 caractères',
          actualValue: value,
          extractedId: videoId
        }
      };
    }

    return null;
  };
}

/**
 * Types d'erreurs pour les validateurs YouTube
 */
export interface YouTubeUrlError {
  youtubeUrl?: {
    message: string;
    actualValue: string;
  };
}

export interface YouTubeVideoIdError {
  youtubeVideoId?: {
    message: string;
    actualValue: string;
    extractedId?: string;
  };
}
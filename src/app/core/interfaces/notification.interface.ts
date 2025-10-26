/**
 * Types de notifications supportés
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Interface pour une notification toast
 */
export interface Notification {
  /** Identifiant unique de la notification */
  id: string;
  /** Type de notification (succès, erreur, info, warning) */
  type: NotificationType;
  /** Message à afficher */
  message: string;
  /** Durée d'affichage en millisecondes (par défaut 3000ms) */
  duration?: number;
  /** Indique si la notification peut être fermée manuellement */
  dismissible?: boolean;
}

/**
 * Configuration par défaut des notifications
 */
export const DEFAULT_NOTIFICATION_CONFIG = {
  duration: 3000,
  dismissible: true,
};

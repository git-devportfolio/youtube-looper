import { Injectable, signal } from '@angular/core';
import {
  Notification,
  NotificationType,
  DEFAULT_NOTIFICATION_CONFIG,
} from '../interfaces';

/**
 * Service de gestion des notifications toast
 * Permet d'afficher des messages temporaires à l'utilisateur
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  // Signal pour la liste des notifications actives
  private readonly notificationsSignal = signal<Notification[]>([]);

  // API publique en lecture seule
  readonly notifications = this.notificationsSignal.asReadonly();

  /**
   * Affiche une notification de succès
   */
  success(message: string, duration?: number): void {
    this.show('success', message, duration);
  }

  /**
   * Affiche une notification d'erreur
   */
  error(message: string, duration?: number): void {
    this.show('error', message, duration);
  }

  /**
   * Affiche une notification d'information
   */
  info(message: string, duration?: number): void {
    this.show('info', message, duration);
  }

  /**
   * Affiche une notification d'avertissement
   */
  warning(message: string, duration?: number): void {
    this.show('warning', message, duration);
  }

  /**
   * Affiche une notification
   */
  private show(
    type: NotificationType,
    message: string,
    duration: number = DEFAULT_NOTIFICATION_CONFIG.duration
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type,
      message,
      duration,
      dismissible: DEFAULT_NOTIFICATION_CONFIG.dismissible,
    };

    // Ajouter la notification à la liste
    this.notificationsSignal.update(notifications => [
      ...notifications,
      notification,
    ]);

    // Auto-suppression après la durée spécifiée
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notification.id);
      }, duration);
    }
  }

  /**
   * Supprime une notification
   */
  dismiss(id: string): void {
    this.notificationsSignal.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  /**
   * Supprime toutes les notifications
   */
  dismissAll(): void {
    this.notificationsSignal.set([]);
  }

  /**
   * Génère un ID unique pour une notification
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services';
import { Notification } from '../../../core/interfaces';

/**
 * Composant conteneur pour afficher les notifications toast
 * Positionné en bas à droite de l'écran
 */
@Component({
  selector: 'app-toast-container',
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastContainerComponent {
  private readonly notificationService = inject(NotificationService);

  // Accès aux notifications actives
  readonly notifications = this.notificationService.notifications;

  /**
   * Ferme une notification
   */
  onDismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  /**
   * Retourne la classe CSS correspondant au type de notification
   */
  getNotificationClass(notification: Notification): string {
    return `toast--${notification.type}`;
  }

  /**
   * Retourne l'icône SVG correspondant au type de notification
   */
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'error':
        return 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'warning':
        return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
      case 'info':
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }
}

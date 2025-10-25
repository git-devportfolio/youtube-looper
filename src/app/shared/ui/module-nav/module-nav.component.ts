import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { FavoritesSidebarStateService } from '../../../features/audio-looper/services';
import { FavoriteService } from '../../../features/audio-looper/data';

interface NavItem {
  label: string;
  route: string;
  icon?: string;
}

@Component({
  selector: 'app-module-nav',
  imports: [CommonModule, RouterModule],
  templateUrl: './module-nav.component.html',
  styleUrl: './module-nav.component.scss'
})
export class ModuleNavComponent {
  private readonly sidebarStateService = inject(FavoritesSidebarStateService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly router = inject(Router);

  readonly navItems: NavItem[] = [
    {
      label: 'YouTube Looper',
      route: '/youtube-looper'
    },
    {
      label: 'Audio Looper',
      route: '/audio-looper'
    }
  ];

  // Signal pour la route courante
  private readonly currentRouteSignal = signal<string>(this.router.url);

  // Accès au nombre de favoris
  readonly favoritesCount = computed(() => this.favoriteService.favorites().length);

  // Vérifie si on est sur la route audio-looper
  readonly isAudioLooperRoute = computed(() => {
    return this.currentRouteSignal().includes('/audio-looper');
  });

  constructor() {
    // Écouter les changements de route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRouteSignal.set(event.url);
      });
  }

  /**
   * Ouvre le sidebar des favoris
   */
  onOpenFavorites(): void {
    this.sidebarStateService.toggle();
  }
}

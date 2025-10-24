import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { FileUploadComponent } from '../file-upload';
import { WaveformDisplayComponent } from '../waveform-display';
import { AudioPlayerComponent } from '../audio-player';
import { VolumeControlComponent } from '../volume-control';
import { FavoritesSidebarComponent } from '../favorites-sidebar';
import { AudioPlayerService, ToneEngineService, WaveformService } from '../../services';
import { FavoriteService } from '../../data';

type LoadingState = 'empty' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-audio-looper-container',
  imports: [CommonModule, FileUploadComponent, WaveformDisplayComponent, AudioPlayerComponent, VolumeControlComponent, FavoritesSidebarComponent],
  templateUrl: './audio-looper-container.component.html',
  styleUrl: './audio-looper-container.component.scss',
  animations: [
    // Animation fade in pour les états vide, chargement et erreur
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),

    // Animation de révélation progressive pour l'état chargé
    trigger('revealLayout', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class AudioLooperContainerComponent {
  private readonly audioPlayerService = inject(AudioPlayerService);
  private readonly toneEngineService = inject(ToneEngineService);
  private readonly waveformService = inject(WaveformService);
  private readonly favoriteService = inject(FavoriteService);

  // Signals pour l'état de l'interface
  readonly loadingState = signal<LoadingState>('empty');
  readonly currentFileName = signal<string>('');
  readonly audioBuffer = signal<AudioBuffer | null>(null);
  readonly errorMessage = signal<string>('');

  // Computed signals pour l'UI
  readonly isEmpty = computed(() => this.loadingState() === 'empty');
  readonly isLoading = computed(() => this.loadingState() === 'loading');
  readonly isLoaded = computed(() => this.loadingState() === 'loaded');
  readonly hasError = computed(() => this.loadingState() === 'error');

  // Signals du service audio
  readonly isReady = this.audioPlayerService.isReady;

  // Signals du service favoris (exposition publique)
  readonly favorites = this.favoriteService.favorites;
  readonly hasFavorites = this.favoriteService.hasFavorites;
  readonly storageStats = this.favoriteService.storageStats;

  // État du sidebar
  readonly sidebarOpen = signal<boolean>(false);

  // État du favori
  private readonly currentFavoriteId = signal<string | null>(null);
  readonly isSavingFavorite = signal<boolean>(false);

  // Computed: vérifie si le fichier actuel est dans les favoris
  readonly isCurrentFileFavorite = computed(() => {
    const fileName = this.currentFileName();
    if (!fileName) return false;
    return this.favoriteService.hasFileByName(fileName);
  });

  /**
   * Gère la sélection d'un fichier audio
   */
  async onFileSelected(file: File): Promise<void> {
    try {
      // Mettre à jour l'état en chargement
      this.loadingState.set('loading');
      this.currentFileName.set(file.name);
      this.errorMessage.set('');

      console.log('Fichier sélectionné:', file.name);

      // Charger le fichier audio
      await this.audioPlayerService.loadAudioFile(file);
      console.log('Fichier chargé avec succès !');

      // Récupérer l'AudioBuffer de Tone.js pour la waveform
      const player = (this.toneEngineService as any).player;
      if (player && player.buffer) {
        const buffer = player.buffer.get() as AudioBuffer;
        this.audioBuffer.set(buffer);
        console.log('AudioBuffer récupéré pour la waveform');

        // Marquer comme chargé
        this.loadingState.set('loaded');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du fichier:', error);
      this.loadingState.set('error');
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement du fichier'
      );
    }
  }

  /**
   * Change le fichier audio (retour à l'upload)
   */
  changeFile(): void {
    // Réinitialiser l'état
    this.loadingState.set('empty');
    this.currentFileName.set('');
    this.audioBuffer.set(null);
    this.errorMessage.set('');

    // Arrêter la lecture si en cours
    if (this.audioPlayerService.isPlaying()) {
      this.audioPlayerService.pause();
    }
  }

  /**
   * Ouvre le sidebar des favoris
   */
  openSidebar(): void {
    this.sidebarOpen.set(true);
  }

  /**
   * Ferme le sidebar des favoris
   */
  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  /**
   * Gère l'upload d'un nouveau fichier depuis le sidebar
   */
  onUploadNewFileFromSidebar(): void {
    this.closeSidebar();
    // TODO: Ouvrir un dialog d'upload ou revenir à l'écran d'upload
    console.log('Upload nouveau fichier depuis sidebar');
  }

  /**
   * Active le mode édition d'ordre des favoris
   */
  onEditOrder(): void {
    console.log('Édition de l\'ordre des favoris');
    // TODO: Implémenter le mode édition d'ordre
  }

  /**
   * Toggle l'état favori du fichier audio actuel
   */
  async toggleFavorite(): Promise<void> {
    if (this.isSavingFavorite()) return;

    const fileName = this.currentFileName();
    const buffer = this.audioBuffer();

    if (!fileName || !buffer) {
      console.warn('Aucun fichier chargé pour ajouter aux favoris');
      return;
    }

    this.isSavingFavorite.set(true);

    try {
      // Si déjà en favori, on retire
      if (this.isCurrentFileFavorite()) {
        const favorite = this.favorites().find(f => f.fileName === fileName);
        if (favorite) {
          const success = await this.favoriteService.remove(favorite.id);
          if (success) {
            console.log('Favori retiré avec succès');
            this.currentFavoriteId.set(null);
          }
        }
      } else {
        // Sinon, on ajoute aux favoris
        // TODO: Récupérer le fichier original pour l'ajouter
        // Pour l'instant, on log juste un message
        console.log('Ajout aux favoris - À implémenter avec le fichier original');
        alert('Fonctionnalité d\'ajout aux favoris à implémenter dans une prochaine tâche');
      }
    } catch (error) {
      console.error('Erreur lors du toggle du favori:', error);
      alert('Erreur lors de la sauvegarde du favori');
    } finally {
      this.isSavingFavorite.set(false);
    }
  }
}

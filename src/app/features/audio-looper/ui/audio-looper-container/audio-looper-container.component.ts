import { Component, inject, signal, computed, effect, untracked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { FileUploadComponent } from '../file-upload';
import { WaveformDisplayComponent } from '../waveform-display';
import { AudioPlayerComponent } from '../audio-player';
import { LoopControlsComponent } from '../loop-controls';
import { FavoritesSidebarComponent } from '../favorites-sidebar';
import { FavoriteQuotaModalComponent } from '../favorite-quota-modal';
import { AudioPlayerService, ToneEngineService, WaveformService, RubberbandEngineService, FavoritesSidebarStateService } from '../../services';
import { FavoriteService } from '../../data';
import { FavoriteSettings, FavoriteModel } from '../../data/interfaces';
import { fileToBase64, getAudioDuration } from '../../utils';
import { NotificationService } from '../../../../core/services';

type LoadingState = 'empty' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-audio-looper-container',
  imports: [CommonModule, FileUploadComponent, WaveformDisplayComponent, AudioPlayerComponent, LoopControlsComponent, FavoritesSidebarComponent, FavoriteQuotaModalComponent],
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
export class AudioLooperContainerComponent implements OnDestroy {
  private readonly audioPlayerService = inject(AudioPlayerService);
  private readonly toneEngineService = inject(ToneEngineService);
  private readonly waveformService = inject(WaveformService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly rubberbandEngine = inject(RubberbandEngineService);
  private readonly sidebarStateService = inject(FavoritesSidebarStateService);
  private readonly notificationService = inject(NotificationService);

  // Timer pour le debounce de l'auto-save
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Auto-save des modifications du favori chargé avec debounce
    effect(() => {
      const hasChanges = this.hasUnsavedChanges();
      const favoriteId = this.currentFavoriteId();

      // Annuler le timer précédent
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }

      // Sauvegarder automatiquement si un favori est chargé et qu'il y a des modifications
      if (hasChanges && favoriteId) {
        // Debounce de 500ms pour éviter les sauvegardes trop fréquentes
        this.autoSaveTimer = setTimeout(() => {
          // Utiliser untracked pour éviter de déclencher l'effet pendant la sauvegarde
          untracked(() => {
            console.log('🔄 Auto-save des modifications du favori...');
            this.updateCurrentFavorite();
          });
        }, 500);
      }
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    // Nettoyer le timer lors de la destruction du composant
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // Signals pour l'état de l'interface
  readonly loadingState = signal<LoadingState>('empty');
  readonly currentFileName = signal<string>('');
  readonly currentFile = signal<File | null>(null); // Stocker le fichier original
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

  // État du sidebar (géré par le service partagé)
  readonly sidebarOpen = this.sidebarStateService.isOpen;

  // État du favori
  private readonly currentFavoriteId = signal<string | null>(null);
  private readonly loadedFavoriteSettings = signal<FavoriteSettings | null>(null); // Réglages initiaux du favori chargé
  readonly isSavingFavorite = signal<boolean>(false);
  private readonly isAutoSaving = signal<boolean>(false); // Protection contre les appels simultanés d'auto-save

  // État de la modal de quota
  readonly quotaModalOpen = signal<boolean>(false);

  // Données en attente d'ajout (après suppression)
  private readonly pendingFavoriteData = signal<{
    fileName: string;
    mimeType: string;
    audioData: string;
    size: number;
    duration: number;
    settings: Partial<FavoriteSettings>;
  } | null>(null);

  // Computed: vérifie si le fichier actuel est dans les favoris
  readonly isCurrentFileFavorite = computed(() => {
    const fileName = this.currentFileName();
    if (!fileName) return false;
    return this.favoriteService.hasFileByName(fileName);
  });

  // Computed: retourne les réglages audio actuels
  private readonly currentSettings = computed((): FavoriteSettings => {
    return {
      pitch: this.rubberbandEngine.pitch(),
      playbackRate: this.toneEngineService.playbackRate(),
      volume: this.audioPlayerService.volume(),
      isMuted: this.audioPlayerService.isMuted(),
      loopStart: this.toneEngineService.loopStart(),
      loopEnd: this.toneEngineService.loopEnd(),
      loopEnabled: this.toneEngineService.isLooping(),
      currentTime: this.audioPlayerService.currentTime()
    };
  });

  // Computed: détecte si le favori chargé a des modifications non sauvegardées
  readonly hasUnsavedChanges = computed(() => {
    const loadedSettings = this.loadedFavoriteSettings();
    const favoriteId = this.currentFavoriteId();

    // Pas de favori chargé
    if (!loadedSettings || !favoriteId) return false;

    const current = this.currentSettings();

    // Comparer les réglages (tolérance pour les nombres flottants)
    const tolerance = 0.01;
    return (
      Math.abs(current.pitch - loadedSettings.pitch) > tolerance ||
      Math.abs(current.playbackRate - loadedSettings.playbackRate) > tolerance ||
      Math.abs(current.volume - loadedSettings.volume) > tolerance ||
      current.isMuted !== loadedSettings.isMuted ||
      Math.abs((current.loopStart ?? 0) - (loadedSettings.loopStart ?? 0)) > tolerance ||
      Math.abs((current.loopEnd ?? 0) - (loadedSettings.loopEnd ?? 0)) > tolerance ||
      current.loopEnabled !== loadedSettings.loopEnabled
      // Note: on ne compare pas currentTime car il change constamment pendant la lecture
    );
  });

  /**
   * Gère la sélection d'un fichier audio
   */
  async onFileSelected(file: File): Promise<void> {
    try {
      // Réinitialiser l'état du favori
      this.currentFavoriteId.set(null);
      this.loadedFavoriteSettings.set(null);

      // Réinitialiser les paramètres audio à leurs valeurs par défaut
      this.rubberbandEngine.setPitch(0);
      this.toneEngineService.setPlaybackRate(1.0);
      this.toneEngineService.resetLoop(); // Réinitialiser la boucle A/B

      // Mettre à jour l'état en chargement
      this.loadingState.set('loading');
      this.currentFileName.set(file.name);
      this.currentFile.set(file); // Stocker le fichier original
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
    // Réinitialiser l'état du favori
    this.currentFavoriteId.set(null);
    this.loadedFavoriteSettings.set(null);

    // Réinitialiser les paramètres audio à leurs valeurs par défaut
    this.rubberbandEngine.setPitch(0);
    this.toneEngineService.setPlaybackRate(1.0);
    this.toneEngineService.resetLoop(); // Réinitialiser la boucle A/B

    // Réinitialiser l'état
    this.loadingState.set('empty');
    this.currentFileName.set('');
    this.currentFile.set(null);
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
    this.sidebarStateService.open();
  }

  /**
   * Ferme le sidebar des favoris
   */
  closeSidebar(): void {
    this.sidebarStateService.close();
  }

  /**
   * Gère l'upload d'un nouveau fichier depuis le sidebar
   */
  onUploadNewFileFromSidebar(): void {
    // Fermer la sidebar
    this.closeSidebar();

    // Revenir à l'écran d'upload en réutilisant la logique de changeFile()
    this.changeFile();
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
    const file = this.currentFile();

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
            this.notificationService.success('Favori supprimé');
          } else {
            this.notificationService.error('Erreur lors de la suppression du favori');
          }
        }
      } else {
        // Sinon, on ajoute aux favoris
        if (!file) {
          console.error('Fichier original non disponible');
          alert('Erreur : fichier original non disponible');
          return;
        }

        // Capturer les réglages audio actuels
        const currentSettings = {
          pitch: this.rubberbandEngine.pitch(),
          playbackRate: this.toneEngineService.playbackRate(),
          currentTime: this.audioPlayerService.currentTime(),
          loopStart: this.toneEngineService.loopStart(),
          loopEnd: this.toneEngineService.loopEnd(),
          loopEnabled: this.toneEngineService.isLooping(),
          volume: this.audioPlayerService.volume(),
          isMuted: this.audioPlayerService.isMuted()
        };

        console.log('Réglages audio capturés:', currentSettings);

        // Convertir le fichier en Base64
        const audioData = await fileToBase64(file);

        // Obtenir la durée audio
        const duration = await getAudioDuration(file);

        console.log('Fichier converti, durée:', duration);

        // Validation des limites avant ajout
        const stats = this.favoriteService.storageStats();
        const currentCount = this.favorites().length;
        const estimatedSize = audioData.length; // Taille approximative en bytes

        // Vérifier la limite de nombre de favoris (10)
        // Vérifier la limite de nombre de favoris (10)
        if (currentCount >= 10) {
          // Sauvegarder les données pour ajout après suppression
          this.pendingFavoriteData.set({
            fileName: fileName,
            mimeType: file.type,
            audioData: audioData,
            size: file.size,
            duration: duration,
            settings: currentSettings
          });
          // Ouvrir la modal pour choisir un favori à supprimer
          this.quotaModalOpen.set(true);
          return;
        }

        // Vérifier la limite de stockage total (100 Mo)
        const maxStorageSize = 100 * 1024 * 1024; // 100 Mo en bytes
        if (stats.totalSize + estimatedSize > maxStorageSize) {
          const sizeInMb = (estimatedSize / (1024 * 1024)).toFixed(2);
          const remainingInMb = ((maxStorageSize - stats.totalSize) / (1024 * 1024)).toFixed(2);
          alert(`Espace insuffisant : ce fichier nécessite ${sizeInMb} Mo mais il ne reste que ${remainingInMb} Mo disponibles.`);
          return;
        }

        console.log('Validation des limites OK, ajout du favori...');

        // Sauvegarder le favori avec l'API correcte du FavoriteService
        const result = await this.favoriteService.add(
          fileName,          // fileName: string
          file.type,         // mimeType: string
          audioData,         // audioData: string (Base64)
          file.size,         // size: number
          duration,          // duration: number
          currentSettings    // settings: Partial<FavoriteSettings>
        );

        if (result.isValid) {
          console.log('Favori ajouté avec succès');
          // Le FavoriteService recharge automatiquement la liste, donc isCurrentFileFavorite() sera mis à jour

          // Stocker l'ID du favori créé et les réglages de référence
          // pour permettre la détection des modifications futures
          if (result.favoriteId) {
            this.currentFavoriteId.set(result.favoriteId);
            this.loadedFavoriteSettings.set({ ...currentSettings });
            console.log('Favori ID stocké:', result.favoriteId);
          }

          this.notificationService.success('Ajouté aux favoris');
        } else {
          console.error('Erreur lors de l\'ajout du favori:', result.errorMessage);

          // Afficher un message d'erreur spécifique selon le code d'erreur
          if (result.errorCode === 'DUPLICATE_FILE') {
            this.notificationService.warning('Ce fichier est déjà dans vos favoris');
          } else if (result.errorCode === 'MAX_FAVORITES') {
            this.notificationService.error(result.errorMessage || 'Limite de favoris atteinte');
          } else if (result.errorCode === 'MAX_SIZE' || result.errorCode === 'QUOTA_EXCEEDED') {
            this.notificationService.error(result.errorMessage || 'Espace de stockage insuffisant');
          } else {
            this.notificationService.error(result.errorMessage || 'Erreur lors de l\'ajout aux favoris');
          }
          alert(`Erreur lors de l'ajout du favori: ${result.errorMessage}`);
        }
      }
    } catch (error) {
      console.error('Erreur lors du toggle du favori:', error);
      alert('Erreur lors de la sauvegarde du favori');
    } finally {
      this.isSavingFavorite.set(false);
    }
  }

  /**
   * Ferme la modal de quota
   */
  closeQuotaModal(): void {
    this.quotaModalOpen.set(false);
    this.pendingFavoriteData.set(null);
  }

  /**
   * Gère l'auto-ajout du favori après suppression
   */
  async onFavoriteDeleted(): Promise<void> {
    const pending = this.pendingFavoriteData();

    if (!pending) {
      console.warn('Aucune donnée en attente pour l\'ajout automatique');
      return;
    }

    console.log('Ajout automatique du favori après suppression...');

    try {
      const result = await this.favoriteService.add(
        pending.fileName,
        pending.mimeType,
        pending.audioData,
        pending.size,
        pending.duration,
        pending.settings
      );

      if (result.isValid) {
        console.log('Favori ajouté automatiquement avec succès');
        this.pendingFavoriteData.set(null);
        this.notificationService.success('Ajouté aux favoris');
      } else {
        console.error('Erreur lors de l\'ajout automatique:', result.errorMessage);
        this.notificationService.error(result.errorMessage || 'Erreur lors de l\'ajout du favori');
        alert(`Erreur lors de l'ajout du favori: ${result.errorMessage}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout automatique:', error);
      this.notificationService.error('Erreur lors de l\'ajout du favori');
      alert('Erreur lors de l\'ajout du favori');
    }
  }

  /**
   * Gère le chargement d'un favori depuis la sidebar (clic sur la card)
   */
  async onLoadFavorite(favorite: FavoriteModel): Promise<void> {
    try {
      console.log('Chargement du favori:', favorite.fileName);

      // Fermer le sidebar
      this.closeSidebar();

      // Réinitialiser la boucle avant de charger le nouveau fichier
      // Elle sera reconfigurée après si le favori a des réglages de boucle
      this.toneEngineService.resetLoop();

      // Mettre à jour l'état en chargement
      this.loadingState.set('loading');
      this.currentFileName.set(favorite.fileName);
      this.errorMessage.set('');

      // Convertir Base64 en Blob
      const binaryString = atob(favorite.audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: favorite.mimeType });

      // Créer un objet File virtuel
      const file = new File([blob], favorite.fileName, { type: favorite.mimeType });
      this.currentFile.set(file);

      // Charger le fichier audio directement sans passer par onFileSelected
      // pour éviter la réinitialisation des IDs et paramètres
      await this.audioPlayerService.loadAudioFile(file);
      console.log('Fichier favori chargé avec succès !');

      // Récupérer l'AudioBuffer de Tone.js pour la waveform
      const player = (this.toneEngineService as any).player;
      if (player && player.buffer) {
        const buffer = player.buffer.get() as AudioBuffer;
        this.audioBuffer.set(buffer);
        console.log('AudioBuffer récupéré pour la waveform');

        // Marquer comme chargé
        this.loadingState.set('loaded');
      }

      // Attendre que le fichier soit complètement chargé
      // Utiliser un court délai pour s'assurer que tous les services sont prêts
      await new Promise(resolve => setTimeout(resolve, 300));

      // Appliquer les réglages sauvegardés
      console.log('Application des réglages du favori:', favorite.settings);

      this.rubberbandEngine.setPitch(favorite.settings.pitch);
      this.toneEngineService.setPlaybackRate(favorite.settings.playbackRate);
      this.audioPlayerService.setVolume(favorite.settings.volume);

      if (favorite.settings.isMuted) {
        this.audioPlayerService.toggleMute();
      }

      // Appliquer la boucle A/B si définie
      if (favorite.settings.loopStart !== null && favorite.settings.loopEnd !== null) {
        this.toneEngineService.setLoopPoints(
          favorite.settings.loopStart,
          favorite.settings.loopEnd
        );

        // Activer la boucle si elle était activée dans les réglages
        if (favorite.settings.loopEnabled && !this.toneEngineService.isLooping()) {
          this.toneEngineService.toggleLoop();
        }
      }

      // Aller à la position de lecture sauvegardée
      if (favorite.settings.currentTime > 0) {
        this.audioPlayerService.seekTo(favorite.settings.currentTime);
      }

      // Marquer le favori comme chargé et stocker ses réglages pour la détection des modifications
      this.currentFavoriteId.set(favorite.id);
      this.loadedFavoriteSettings.set({ ...favorite.settings });

      console.log('Favori chargé avec succès avec tous ses réglages');
    } catch (error) {
      console.error('Erreur lors du chargement du favori:', error);
      this.loadingState.set('error');
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Une erreur est survenue lors du chargement du favori'
      );
    }
  }

  /**
   * Gère la lecture immédiate d'un favori (bouton Play)
   */
  async onPlayFavorite(favorite: FavoriteModel): Promise<void> {
    // Charger le favori d'abord
    await this.onLoadFavorite(favorite);

    // Démarrer la lecture automatiquement
    if (this.isReady() && !this.audioPlayerService.isPlaying()) {
      this.audioPlayerService.play();
    }
  }

  /**
   * Met à jour le favori actuellement chargé avec les réglages modifiés
   */
  async updateCurrentFavorite(): Promise<void> {
    const favoriteId = this.currentFavoriteId();

    if (!favoriteId) {
      console.warn('Aucun favori chargé à mettre à jour');
      return;
    }

    // Éviter les appels simultanés
    if (this.isAutoSaving()) {
      console.log('⏭️ Auto-save déjà en cours, ignorer cette demande');
      return;
    }

    try {
      this.isAutoSaving.set(true);

      // Récupérer les réglages actuels
      const updatedSettings = this.currentSettings();

      console.log('Mise à jour du favori:', favoriteId, updatedSettings);

      // Mettre à jour via le service
      const result = await this.favoriteService.updateSettings(favoriteId, updatedSettings);

      if (result.isValid) {
        // Mettre à jour les réglages de référence pour refléter la sauvegarde
        this.loadedFavoriteSettings.set({ ...updatedSettings });

        console.log('✅ Favori mis à jour avec succès');
        this.notificationService.success('Modifications enregistrées');
      } else {
        console.error('❌ Erreur lors de la mise à jour du favori:', result.errorMessage);
        this.notificationService.error(result.errorMessage || 'Erreur lors de la mise à jour');
        alert(`Erreur lors de la mise à jour: ${result.errorMessage}`);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du favori:', error);
      this.notificationService.error('Erreur lors de la mise à jour du favori');
      alert('Erreur lors de la mise à jour du favori');
    } finally {
      this.isAutoSaving.set(false);
    }
  }
}

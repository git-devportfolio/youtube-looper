import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class YouTubeApiLoaderService {
  private static readonly YOUTUBE_API_URL = 'https://www.youtube.com/iframe_api';
  private static isLoading = false;
  private static isLoaded = false;
  private static loadPromise: Promise<void> | null = null;

  /**
   * Charge l'API YouTube IFrame Player de manière asynchrone
   */
  async loadYouTubeAPI(): Promise<void> {
    // Si l'API est déjà chargée
    if (YouTubeApiLoaderService.isLoaded || (window.YT && window.YT.Player)) {
      return Promise.resolve();
    }

    // Si le chargement est en cours, retourner la promesse existante
    if (YouTubeApiLoaderService.loadPromise) {
      return YouTubeApiLoaderService.loadPromise;
    }

    // Créer une nouvelle promesse de chargement
    YouTubeApiLoaderService.loadPromise = this.createLoadPromise();
    return YouTubeApiLoaderService.loadPromise;
  }

  private createLoadPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Définir le callback global pour YouTube API
      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        YouTubeApiLoaderService.isLoaded = true;
        YouTubeApiLoaderService.isLoading = false;
        
        // Restaurer l'ancien callback s'il existait
        if (originalCallback) {
          originalCallback();
        }
        
        resolve();
      };

      // Timeout de sécurité
      const timeout = setTimeout(() => {
        YouTubeApiLoaderService.isLoading = false;
        reject(new Error('Timeout lors du chargement de l\'API YouTube'));
      }, 10000);

      // Créer et injecter le script
      const script = document.createElement('script');
      script.src = YouTubeApiLoaderService.YOUTUBE_API_URL;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        clearTimeout(timeout);
        // Le callback onYouTubeIframeAPIReady sera appelé automatiquement
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        YouTubeApiLoaderService.isLoading = false;
        reject(new Error('Erreur lors du chargement du script API YouTube'));
      };

      YouTubeApiLoaderService.isLoading = true;
      document.head.appendChild(script);
    });
  }

  /**
   * Vérifie si l'API YouTube est disponible
   */
  isAPIReady(): boolean {
    return YouTubeApiLoaderService.isLoaded && !!(window.YT && window.YT.Player);
  }

  /**
   * Vérifie si l'API est en cours de chargement
   */
  isAPILoading(): boolean {
    return YouTubeApiLoaderService.isLoading;
  }

  /**
   * Attend que l'API YouTube soit prête
   */
  async waitForAPI(): Promise<void> {
    if (this.isAPIReady()) {
      return Promise.resolve();
    }

    if (!this.isAPILoading() && !YouTubeApiLoaderService.loadPromise) {
      return this.loadYouTubeAPI();
    }

    if (YouTubeApiLoaderService.loadPromise) {
      return YouTubeApiLoaderService.loadPromise;
    }

    // Attendre avec un polling
    return new Promise((resolve, reject) => {
      const maxAttempts = 50;
      let attempts = 0;
      
      const checkAPI = () => {
        attempts++;
        
        if (this.isAPIReady()) {
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('Timeout: l\'API YouTube n\'est pas disponible'));
          return;
        }
        
        setTimeout(checkAPI, 100);
      };
      
      checkAPI();
    });
  }
}
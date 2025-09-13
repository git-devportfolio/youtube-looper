import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { YouTubePlayerService } from './youtube-player.service';

export interface LoopConfig {
  startTime: number;
  endTime: number;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LoopService {
  private readonly youTubePlayerService = inject(YouTubePlayerService);
  private readonly destroyRef = inject(DestroyRef);

  // Signals pour l'état de la boucle
  private readonly _startTime = signal<number>(0);
  private readonly _endTime = signal<number>(0);
  private readonly _isLoopActive = signal<boolean>(false);
  private readonly _hasValidLoop = computed(() => 
    this._startTime() < this._endTime() && 
    this._startTime() >= 0 && 
    this._endTime() > 0
  );

  // Propriétés publiques en lecture seule
  readonly startTime = this._startTime.asReadonly();
  readonly endTime = this._endTime.asReadonly();
  readonly isLoopActive = this._isLoopActive.asReadonly();
  readonly hasValidLoop = this._hasValidLoop; // Computed signals sont déjà readonly

  // Signal computed pour la configuration complète de la boucle
  readonly currentLoop = computed((): LoopConfig => ({
    startTime: this._startTime(),
    endTime: this._endTime(),
    isActive: this._isLoopActive()
  }));

  // Interval de surveillance (sera créé quand la boucle est activée)
  private monitoringInterval?: ReturnType<typeof setInterval>;

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Définit le temps de début de la boucle
   */
  setStartTime(time: number): void {
    if (time >= 0) {
      this._startTime.set(time);
      console.log(`LoopService: Start time set to ${time}s`);
    }
  }

  /**
   * Définit le temps de fin de la boucle
   */
  setEndTime(time: number): void {
    if (time > 0) {
      this._endTime.set(time);
      console.log(`LoopService: End time set to ${time}s`);
    }
  }

  /**
   * Active/désactive la boucle
   */
  toggleLoop(): void {
    const wasActive = this._isLoopActive();
    const newState = !wasActive;
    
    if (newState && !this.hasValidLoop()) {
      console.warn('LoopService: Cannot activate loop - invalid loop configuration');
      return;
    }

    this._isLoopActive.set(newState);
    
    if (newState) {
      this.startMonitoring();
      console.log(`LoopService: Loop activated (${this._startTime()}s - ${this._endTime()}s)`);
    } else {
      this.stopMonitoring();
      console.log('LoopService: Loop deactivated');
    }
  }

  /**
   * Active la boucle
   */
  activateLoop(): void {
    if (!this._isLoopActive()) {
      this.toggleLoop();
    }
  }

  /**
   * Désactive la boucle
   */
  deactivateLoop(): void {
    if (this._isLoopActive()) {
      this.toggleLoop();
    }
  }

  /**
   * Définit une boucle complète et l'active optionnellement
   */
  setLoop(startTime: number, endTime: number, activate: boolean = false): void {
    this.setStartTime(startTime);
    this.setEndTime(endTime);
    
    if (activate && this.hasValidLoop()) {
      this.activateLoop();
    }
  }

  /**
   * Réinitialise la configuration de la boucle
   */
  resetLoop(): void {
    this.deactivateLoop();
    this._startTime.set(0);
    this._endTime.set(0);
    console.log('LoopService: Loop reset');
  }

  /**
   * Initialise le système de surveillance
   */
  private initializeMonitoring(): void {
    // Le monitoring sera démarré/arrêté dynamiquement
    // selon l'état de la boucle
  }

  /**
   * Démarre la surveillance de la position de lecture
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    // Vérifier la position toutes les 100ms pour une précision suffisante
    this.monitoringInterval = setInterval(() => {
      this.checkLoopPosition();
    }, 100);

    console.log('LoopService: Monitoring started');
  }

  /**
   * Arrête la surveillance de la position de lecture
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('LoopService: Monitoring stopped');
    }
  }

  /**
   * Vérifie la position actuelle et effectue la boucle si nécessaire
   */
  private checkLoopPosition(): void {
    if (!this._isLoopActive() || !this.hasValidLoop()) {
      return;
    }

    const currentTime = this.youTubePlayerService.currentTime();
    const endTime = this._endTime();
    const startTime = this._startTime();

    // Si on a dépassé la fin de la boucle, revenir au début
    if (currentTime >= endTime) {
      console.log(`LoopService: Loop reached end (${currentTime}s >= ${endTime}s), seeking to start (${startTime}s)`);
      this.youTubePlayerService.seekTo(startTime);
    }
  }

  /**
   * Nettoie les ressources lors de la destruction du service
   */
  ngOnDestroy(): void {
    this.stopMonitoring();
  }
}
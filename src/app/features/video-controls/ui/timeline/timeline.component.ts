import { Component, signal, computed, inject, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { LoopService, YouTubePlayerService } from '../../../../core';

@Component({
  selector: 'app-timeline',
  imports: [],
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss'
})
export class TimelineComponent implements OnInit, OnDestroy {
  private readonly loopService = inject(LoopService);
  private readonly youTubePlayerService = inject(YouTubePlayerService);
  private readonly elementRef = inject(ElementRef);

  // Signals pour l'état du composant
  private readonly _isDragging = signal(false);
  private readonly _dragTarget = signal<'start' | 'end' | null>(null);
  private readonly _hoveredHandle = signal<'start' | 'end' | null>(null);

  // Positions temporaires pendant le drag pour mise à jour visuelle immédiate
  private readonly _tempStartTime = signal<number | null>(null);
  private readonly _tempEndTime = signal<number | null>(null);

  // Signals basés sur les services
  readonly startTime = this.loopService.startTime;
  readonly endTime = this.loopService.endTime;
  readonly isLoopActive = this.loopService.isLoopActive;
  readonly hasValidLoop = this.loopService.hasValidLoop;
  readonly currentTime = this.youTubePlayerService.currentTime;
  readonly duration = this.youTubePlayerService.duration;
  readonly isReady = this.youTubePlayerService.isReady;

  // Signals computed pour l'UI avec support des valeurs temporaires pendant le drag
  readonly startPosition = computed(() => {
    const dur = this.duration();
    if (dur <= 0) return 0;

    // Utiliser la valeur temporaire pendant le drag si disponible
    const tempStart = this._tempStartTime();
    const actualStart = tempStart !== null ? tempStart : this.startTime();
    return (actualStart / dur) * 100;
  });

  readonly endPosition = computed(() => {
    const dur = this.duration();
    if (dur <= 0) return 100;

    // Utiliser la valeur temporaire pendant le drag si disponible
    const tempEnd = this._tempEndTime();
    const actualEnd = tempEnd !== null ? tempEnd : this.endTime();
    return (actualEnd / dur) * 100;
  });

  readonly currentPosition = computed(() => {
    const dur = this.duration();
    return dur > 0 ? (this.currentTime() / dur) * 100 : 0;
  });

  readonly loopWidth = computed(() => {
    return Math.max(0, this.endPosition() - this.startPosition());
  });

  // Computed signals pour la synchronisation avec LoopService
  readonly loopServiceStartTime = computed(() => this.loopService.startTime());
  readonly loopServiceEndTime = computed(() => this.loopService.endTime());
  readonly loopServiceIsActive = computed(() => this.loopService.isLoopActive());
  readonly loopServiceHasValidLoop = computed(() => this.loopService.hasValidLoop());

  // Propriétés publiques readonly
  readonly isDragging = this._isDragging.asReadonly();
  readonly dragTarget = this._dragTarget.asReadonly();
  readonly hoveredHandle = this._hoveredHandle.asReadonly();

  private monitoringInterval?: ReturnType<typeof setInterval>;
  private dragStartX = 0;
  private dragStartTime = 0;
  private timelineRect?: DOMRect;

  // Debounce pour les mises à jour du LoopService
  private loopUpdateDebounceTimer?: ReturnType<typeof setTimeout>;

  // Debounce pour les appels à seekTo
  private seekToDebounceTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.startTimeMonitoring();
  }

  ngOnDestroy(): void {
    this.stopTimeMonitoring();
    // Nettoyer les timers de debounce
    if (this.loopUpdateDebounceTimer) {
      clearTimeout(this.loopUpdateDebounceTimer);
    }
    if (this.seekToDebounceTimer) {
      clearTimeout(this.seekToDebounceTimer);
    }
  }

  /**
   * Démarre la surveillance du temps pour mettre à jour la position courante
   */
  private startTimeMonitoring(): void {
    // Mettre à jour la position toutes les 100ms
    this.monitoringInterval = setInterval(() => {
      // Le currentTime signal se met à jour automatiquement
      // Pas besoin d'action supplémentaire ici
    }, 100);
  }

  /**
   * Arrête la surveillance du temps
   */
  private stopTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Convertit une position en pourcentage vers un temps en secondes
   */
  positionToTime(position: number): number {
    const dur = this.duration();
    return (position / 100) * dur;
  }

  /**
   * Convertit un temps en secondes vers une position en pourcentage
   */
  timeToPosition(time: number): number {
    const dur = this.duration();
    return dur > 0 ? (time / dur) * 100 : 0;
  }

  /**
   * Formate un temps en secondes vers MM:SS
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Valide que les bornes respectent les contraintes
   */
  private validateBounds(startTime: number, endTime: number): { isValid: boolean; constrainedStart: number; constrainedEnd: number } {
    const videoDuration = this.duration();

    // Contraindre dans les limites de la vidéo
    const constrainedStart = Math.max(0, Math.min(startTime, videoDuration - 1));
    const constrainedEnd = Math.max(constrainedStart + 1, Math.min(endTime, videoDuration));

    // Vérifier que start < end avec une marge minimale de 1 seconde
    const isValid = constrainedStart < constrainedEnd && constrainedEnd - constrainedStart >= 1;

    return {
      isValid,
      constrainedStart,
      constrainedEnd
    };
  }

  /**
   * Met à jour le temps de début avec validation
   */
  setStartTime(time: number): void {
    const validation = this.validateBounds(time, this.endTime());
    if (validation.isValid) {
      this.loopService.setStartTime(validation.constrainedStart);
      console.log(`Timeline: Start time set to ${validation.constrainedStart}s`);
    } else {
      console.warn(`Timeline: Invalid start time ${time}s, constrained to ${validation.constrainedStart}s`);
      this.loopService.setStartTime(validation.constrainedStart);
    }
  }

  /**
   * Met à jour le temps de fin avec validation
   */
  setEndTime(time: number): void {
    const validation = this.validateBounds(this.startTime(), time);
    if (validation.isValid) {
      this.loopService.setEndTime(validation.constrainedEnd);
      console.log(`Timeline: End time set to ${validation.constrainedEnd}s`);
    } else {
      console.warn(`Timeline: Invalid end time ${time}s, constrained to ${validation.constrainedEnd}s`);
      this.loopService.setEndTime(validation.constrainedEnd);
    }
  }

  /**
   * Met à jour les bornes du LoopService avec debounce et activation automatique
   */
  private updateLoopBoundsWithDebounce(startTime: number, endTime: number): void {
    // Nettoyer le timer précédent
    if (this.loopUpdateDebounceTimer) {
      clearTimeout(this.loopUpdateDebounceTimer);
    }

    // Planifier la mise à jour avec debounce de 100ms
    this.loopUpdateDebounceTimer = setTimeout(() => {
      const validation = this.validateBounds(startTime, endTime);

      if (validation.isValid) {
        // Mettre à jour les bornes dans le LoopService
        this.loopService.setStartTime(validation.constrainedStart);
        this.loopService.setEndTime(validation.constrainedEnd);

        // Activer automatiquement la boucle et démarrer la lecture
        if (!this.loopService.isLoopActive()) {
          this.loopService.activateLoop();

          // Démarrer la lecture si elle n'est pas déjà en cours
          if (!this.youTubePlayerService.isPlaying()) {
            this.youTubePlayerService.play();
          }

          console.log(`Timeline: Loop auto-activated with playback started - bounds ${validation.constrainedStart}s - ${validation.constrainedEnd}s`);
        }

        console.log(`Timeline: Bounds updated via debounce: ${validation.constrainedStart}s - ${validation.constrainedEnd}s`);
      }
    }, 100);
  }

  /**
   * Repositionne la lecture vidéo avec debounce pour éviter les appels excessifs
   */
  private seekToWithDebounce(time: number): void {
    // Vérifier que le lecteur est prêt
    if (!this.isReady()) {
      console.warn('Timeline: Cannot seek - player not ready');
      return;
    }

    // Nettoyer le timer précédent
    if (this.seekToDebounceTimer) {
      clearTimeout(this.seekToDebounceTimer);
    }

    // Planifier le repositionnement avec debounce de 200ms
    this.seekToDebounceTimer = setTimeout(() => {
      try {
        this.youTubePlayerService.seekTo(time);
        console.log(`Timeline: Video seeked to ${time}s`);
      } catch (error) {
        console.error('Timeline: Error seeking video:', error);
      }
    }, 200);
  }

  /**
   * Gestion des événements de survol
   */
  onHandleHover(handle: 'start' | 'end' | null): void {
    this._hoveredHandle.set(handle);
  }

  /**
   * Gestion du drag avec la souris
   */
  onDragStart(handle: 'start' | 'end', event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();

      this.dragStartX = event.clientX;
      this.dragStartTime = handle === 'start' ? this.startTime() : this.endTime();

      // Obtenir les dimensions de la timeline
      const timelineTrack = this.elementRef.nativeElement.querySelector('.timeline-track');
      if (timelineTrack) {
        this.timelineRect = timelineTrack.getBoundingClientRect();
      }
    }

    this._isDragging.set(true);
    this._dragTarget.set(handle);

    // Initialiser les valeurs temporaires
    this._tempStartTime.set(this.startTime());
    this._tempEndTime.set(this.endTime());

    console.log(`Drag started for ${handle} handle`);
  }

  /**
   * Fin du drag
   */
  onDragEnd(): void {
    this._isDragging.set(false);
    this._dragTarget.set(null);

    // Nettoyer les valeurs temporaires
    this._tempStartTime.set(null);
    this._tempEndTime.set(null);
  }

  /**
   * Listeners globaux pour les événements de souris
   */
  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.isDragging() || !this.timelineRect) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - this.dragStartX;
    const timelineWidth = this.timelineRect.width;
    const deltaPercentage = (deltaX / timelineWidth) * 100;

    const currentHandle = this.dragTarget();
    if (!currentHandle) return;

    // Calculer le nouveau temps
    const currentPercentage = this.timeToPosition(this.dragStartTime);
    const newPercentage = Math.max(0, Math.min(100, currentPercentage + deltaPercentage));
    const newTime = this.positionToTime(newPercentage);

    // Mettre à jour les valeurs temporaires IMMÉDIATEMENT pour le feedback visuel
    if (currentHandle === 'start') {
      // Utiliser les valeurs temporaires pour les contraintes afin d'éviter la latence
      const currentEndTime = this._tempEndTime() || this.endTime();
      const constrainedTime = Math.max(0, Math.min(newTime, currentEndTime - 1));
      this._tempStartTime.set(constrainedTime);

      // Mettre à jour le service avec debounce
      this.updateLoopBoundsWithDebounce(constrainedTime, currentEndTime);
      // Repositionner automatiquement la lecture sur la nouvelle position start
      this.seekToWithDebounce(constrainedTime);
    } else if (currentHandle === 'end') {
      // Utiliser les valeurs temporaires pour les contraintes afin d'éviter la latence
      const currentStartTime = this._tempStartTime() || this.startTime();
      const constrainedTime = Math.max(currentStartTime + 1, Math.min(newTime, this.duration()));
      this._tempEndTime.set(constrainedTime);

      // Mettre à jour le service avec debounce
      this.updateLoopBoundsWithDebounce(currentStartTime, constrainedTime);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onDocumentMouseUp(event: MouseEvent): void {
    if (this.isDragging()) {
      event.preventDefault();
      this.onDragEnd();
      console.log(`Drag ended for ${this.dragTarget()} handle`);
    }
  }

  /**
   * Gestion du clic sur la timeline pour positionner les poignées
   */
  onTimelineClick(event: MouseEvent): void {
    if (this.isDragging() || !this.isReady()) {
      return;
    }

    const timelineTrack = this.elementRef.nativeElement.querySelector('.timeline-track');
    if (!timelineTrack) return;

    const rect = timelineTrack.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const clickTime = this.positionToTime(Math.max(0, Math.min(100, percentage)));

    // Déterminer quelle poignée déplacer (la plus proche)
    const distanceToStart = Math.abs(clickTime - this.startTime());
    const distanceToEnd = Math.abs(clickTime - this.endTime());

    if (distanceToStart < distanceToEnd) {
      // Déplacer la poignée start, mais respecter les contraintes
      const constrainedTime = Math.max(0, Math.min(clickTime, this.endTime() - 1));
      this.setStartTime(constrainedTime);
      console.log(`Timeline click: moved start to ${constrainedTime}s`);
    } else {
      // Déplacer la poignée end, mais respecter les contraintes
      const constrainedTime = Math.max(this.startTime() + 1, Math.min(clickTime, this.duration()));
      this.setEndTime(constrainedTime);
      console.log(`Timeline click: moved end to ${constrainedTime}s`);
    }
  }

  /**
   * Empêcher la sélection de texte pendant le drag
   */
  @HostListener('document:selectstart', ['$event'])
  onDocumentSelectStart(event: Event): void {
    if (this.isDragging()) {
      event.preventDefault();
    }
  }

  // ============ SUPPORT TACTILE ============

  /**
   * Début du drag tactile
   */
  onTouchStart(handle: 'start' | 'end', event: TouchEvent): void {
    if (event.touches.length !== 1) return;

    event.preventDefault();
    event.stopPropagation();

    const touch = event.touches[0];
    this.dragStartX = touch.clientX;
    this.dragStartTime = handle === 'start' ? this.startTime() : this.endTime();

    // Obtenir les dimensions de la timeline
    const timelineTrack = this.elementRef.nativeElement.querySelector('.timeline-track');
    if (timelineTrack) {
      this.timelineRect = timelineTrack.getBoundingClientRect();
    }

    this._isDragging.set(true);
    this._dragTarget.set(handle);

    // Initialiser les valeurs temporaires
    this._tempStartTime.set(this.startTime());
    this._tempEndTime.set(this.endTime());

    console.log(`Touch drag started for ${handle} handle`);
  }

  /**
   * Gestion du mouvement tactile
   */
  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(event: TouchEvent): void {
    if (!this.isDragging() || !this.timelineRect || event.touches.length !== 1) {
      return;
    }

    event.preventDefault();

    const touch = event.touches[0];
    const deltaX = touch.clientX - this.dragStartX;
    const timelineWidth = this.timelineRect.width;
    const deltaPercentage = (deltaX / timelineWidth) * 100;

    const currentHandle = this.dragTarget();
    if (!currentHandle) return;

    // Calculer le nouveau temps
    const currentPercentage = this.timeToPosition(this.dragStartTime);
    const newPercentage = Math.max(0, Math.min(100, currentPercentage + deltaPercentage));
    const newTime = this.positionToTime(newPercentage);

    // Mettre à jour les valeurs temporaires IMMÉDIATEMENT pour le feedback visuel
    if (currentHandle === 'start') {
      // Utiliser les valeurs temporaires pour les contraintes afin d'éviter la latence
      const currentEndTime = this._tempEndTime() || this.endTime();
      const constrainedTime = Math.max(0, Math.min(newTime, currentEndTime - 1));
      this._tempStartTime.set(constrainedTime);

      // Mettre à jour le service avec debounce
      this.updateLoopBoundsWithDebounce(constrainedTime, currentEndTime);
      // Repositionner automatiquement la lecture sur la nouvelle position start
      this.seekToWithDebounce(constrainedTime);
    } else if (currentHandle === 'end') {
      // Utiliser les valeurs temporaires pour les contraintes afin d'éviter la latence
      const currentStartTime = this._tempStartTime() || this.startTime();
      const constrainedTime = Math.max(currentStartTime + 1, Math.min(newTime, this.duration()));
      this._tempEndTime.set(constrainedTime);

      // Mettre à jour le service avec debounce
      this.updateLoopBoundsWithDebounce(currentStartTime, constrainedTime);
    }
  }

  /**
   * Fin du drag tactile
   */
  @HostListener('document:touchend', ['$event'])
  onDocumentTouchEnd(event: TouchEvent): void {
    if (this.isDragging()) {
      event.preventDefault();
      this.onDragEnd();
      console.log(`Touch drag ended for ${this.dragTarget()} handle`);
    }
  }

  /**
   * Gestion du tap sur la timeline pour les appareils tactiles
   */
  onTimelineTouchStart(event: TouchEvent): void {
    if (this.isDragging() || !this.isReady() || event.touches.length !== 1) {
      return;
    }

    // Empêcher le traitement du mouseclick qui suit
    event.preventDefault();
    
    const timelineTrack = this.elementRef.nativeElement.querySelector('.timeline-track');
    if (!timelineTrack) return;

    const touch = event.touches[0];
    const rect = timelineTrack.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const percentage = (touchX / rect.width) * 100;
    const tapTime = this.positionToTime(Math.max(0, Math.min(100, percentage)));

    // Déterminer quelle poignée déplacer (la plus proche)
    const distanceToStart = Math.abs(tapTime - this.startTime());
    const distanceToEnd = Math.abs(tapTime - this.endTime());

    if (distanceToStart < distanceToEnd) {
      // Déplacer la poignée start
      const constrainedTime = Math.max(0, Math.min(tapTime, this.endTime() - 1));
      this.setStartTime(constrainedTime);
      console.log(`Timeline tap: moved start to ${constrainedTime}s`);
    } else {
      // Déplacer la poignée end
      const constrainedTime = Math.max(this.startTime() + 1, Math.min(tapTime, this.duration()));
      this.setEndTime(constrainedTime);
      console.log(`Timeline tap: moved end to ${constrainedTime}s`);
    }
  }
}

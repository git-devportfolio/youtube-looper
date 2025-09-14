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

  // Signals basés sur les services
  readonly startTime = this.loopService.startTime;
  readonly endTime = this.loopService.endTime;
  readonly isLoopActive = this.loopService.isLoopActive;
  readonly hasValidLoop = this.loopService.hasValidLoop;
  readonly currentTime = this.youTubePlayerService.currentTime;
  readonly duration = this.youTubePlayerService.duration;
  readonly isReady = this.youTubePlayerService.isReady;

  // Signals computed pour l'UI
  readonly startPosition = computed(() => {
    const dur = this.duration();
    return dur > 0 ? (this.startTime() / dur) * 100 : 0;
  });

  readonly endPosition = computed(() => {
    const dur = this.duration();
    return dur > 0 ? (this.endTime() / dur) * 100 : 100;
  });

  readonly currentPosition = computed(() => {
    const dur = this.duration();
    return dur > 0 ? (this.currentTime() / dur) * 100 : 0;
  });

  readonly loopWidth = computed(() => {
    return Math.max(0, this.endPosition() - this.startPosition());
  });

  // Propriétés publiques readonly
  readonly isDragging = this._isDragging.asReadonly();
  readonly dragTarget = this._dragTarget.asReadonly();
  readonly hoveredHandle = this._hoveredHandle.asReadonly();

  private monitoringInterval?: ReturnType<typeof setInterval>;
  private dragStartX = 0;
  private dragStartTime = 0;
  private timelineRect?: DOMRect;

  ngOnInit(): void {
    this.startTimeMonitoring();
  }

  ngOnDestroy(): void {
    this.stopTimeMonitoring();
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
   * Met à jour le temps de début
   */
  setStartTime(time: number): void {
    this.loopService.setStartTime(time);
  }

  /**
   * Met à jour le temps de fin
   */
  setEndTime(time: number): void {
    this.loopService.setEndTime(time);
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
    
    console.log(`Drag started for ${handle} handle`);
  }

  /**
   * Fin du drag
   */
  onDragEnd(): void {
    this._isDragging.set(false);
    this._dragTarget.set(null);
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
    
    // Appliquer les contraintes
    if (currentHandle === 'start') {
      const constrainedTime = Math.max(0, Math.min(newTime, this.endTime() - 1));
      this.setStartTime(constrainedTime);
    } else if (currentHandle === 'end') {
      const constrainedTime = Math.max(this.startTime() + 1, Math.min(newTime, this.duration()));
      this.setEndTime(constrainedTime);
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
    
    // Appliquer les contraintes
    if (currentHandle === 'start') {
      const constrainedTime = Math.max(0, Math.min(newTime, this.endTime() - 1));
      this.setStartTime(constrainedTime);
    } else if (currentHandle === 'end') {
      const constrainedTime = Math.max(this.startTime() + 1, Math.min(newTime, this.duration()));
      this.setEndTime(constrainedTime);
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

import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WaveformService, AudioPlayerService } from '../../services';

@Component({
  selector: 'app-waveform-display',
  imports: [CommonModule],
  templateUrl: './waveform-display.component.html',
  styleUrl: './waveform-display.component.scss'
})
export class WaveformDisplayComponent implements AfterViewInit, OnDestroy {
  @ViewChild('waveformCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly waveformService = inject(WaveformService);
  private readonly audioPlayerService = inject(AudioPlayerService);
  private resizeObserver?: ResizeObserver;
  private canvasInitialized = false;
  private animationFrameId?: number;

  // Input pour l'AudioBuffer
  readonly audioBuffer = input<AudioBuffer | null>(null);

  // Signals du service
  readonly isGenerating = this.waveformService.isGenerating;
  readonly peaks = this.waveformService.peaks;

  constructor() {
    // Effect pour regénérer la waveform quand l'AudioBuffer change
    effect(() => {
      const buffer = this.audioBuffer();

      // Vérifier que le canvas est initialisé avant de dessiner
      if (!this.canvasInitialized) {
        return;
      }

      if (buffer) {
        this.generateAndDrawWaveform(buffer);
      } else {
        this.clearWaveform();
      }
    });

    // Effect pour démarrer/arrêter l'animation du curseur
    effect(() => {
      const isPlaying = this.audioPlayerService.isPlaying();

      if (isPlaying && this.canvasInitialized) {
        this.startCursorAnimation();
      } else {
        this.stopCursorAnimation();
        // Redessiner une dernière fois pour afficher le curseur à la position finale
        if (this.canvasInitialized) {
          this.redrawWaveform();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Initialiser le canvas
    this.initCanvas();

    // Marquer le canvas comme initialisé
    this.canvasInitialized = true;

    // Observer le redimensionnement
    this.setupResizeObserver();

    // Traiter l'audioBuffer si déjà présent, sinon dessiner le placeholder
    const buffer = this.audioBuffer();
    if (buffer) {
      this.generateAndDrawWaveform(buffer);
    } else {
      this.drawPlaceholder();
    }
  }

  ngOnDestroy(): void {
    // Nettoyer l'observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Arrêter l'animation
    this.stopCursorAnimation();
  }

  /**
   * Initialise le canvas avec les bonnes dimensions
   */
  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;

    if (container) {
      // Définir les dimensions du canvas
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Adapter pour les écrans haute résolution
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Appliquer les dimensions CSS
      canvas.style.width = container.clientWidth + 'px';
      canvas.style.height = container.clientHeight + 'px';
    }
  }

  /**
   * Configure l'observer de redimensionnement
   */
  private setupResizeObserver(): void {
    const canvas = this.canvasRef.nativeElement;

    this.resizeObserver = new ResizeObserver(() => {
      this.initCanvas();
      this.redrawWaveform();
    });

    if (canvas.parentElement) {
      this.resizeObserver.observe(canvas.parentElement);
    }
  }

  /**
   * Génère et dessine la waveform
   */
  private async generateAndDrawWaveform(audioBuffer: AudioBuffer): Promise<void> {
    try {
      const canvas = this.canvasRef.nativeElement;
      const targetWidth = Math.floor(canvas.width / (window.devicePixelRatio || 1));

      await this.waveformService.generateWaveform(audioBuffer, targetWidth);
      this.redrawWaveform();
    } catch (error) {
      console.error('Erreur lors de la génération de la waveform:', error);
    }
  }

  /**
   * Redessine la waveform avec le curseur de lecture
   */
  private redrawWaveform(): void {
    if (this.peaks().length > 0) {
      const canvas = this.canvasRef.nativeElement;
      this.waveformService.drawWaveform(canvas);
      this.drawPlaybackCursor();
    }
  }

  /**
   * Démarre l'animation du curseur (60 FPS)
   */
  private startCursorAnimation(): void {
    this.stopCursorAnimation(); // S'assurer qu'il n'y a pas déjà une animation en cours

    const animate = () => {
      this.redrawWaveform();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Arrête l'animation du curseur
   */
  private stopCursorAnimation(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  /**
   * Dessine le curseur de lecture sur la waveform
   */
  private drawPlaybackCursor(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const duration = this.audioPlayerService.duration();
    const currentTime = this.audioPlayerService.currentTime();

    if (duration === 0) return;

    // Calculer la position X du curseur en fonction du temps
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const cursorX = (currentTime / duration) * width;

    // Dessiner le curseur (ligne verticale)
    ctx.save();
    ctx.strokeStyle = '#ef4444'; // Rouge vif
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();

    // Dessiner un petit cercle en haut du curseur
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cursorX, 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Dessine le placeholder
   */
  private drawPlaceholder(): void {
    const canvas = this.canvasRef.nativeElement;
    this.waveformService.drawPlaceholder(canvas);
  }

  /**
   * Efface la waveform
   */
  private clearWaveform(): void {
    this.waveformService.clearWaveform();
    this.drawPlaceholder();
  }

  /**
   * Gère le clic sur le canvas pour naviguer dans l'audio
   */
  onCanvasClick(event: MouseEvent): void {
    // Ne rien faire si l'audio n'est pas prêt
    if (!this.audioPlayerService.isReady()) {
      return;
    }

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const canvasWidth = rect.width;

    // Calculer la position temporelle en fonction du clic
    const clickRatio = Math.max(0, Math.min(1, x / canvasWidth));
    const duration = this.audioPlayerService.duration();
    const targetTime = clickRatio * duration;

    // Déplacer la lecture à la position cliquée
    this.audioPlayerService.seekTo(targetTime);

    // Redessiner immédiatement pour afficher le curseur à la nouvelle position
    this.redrawWaveform();

    // Feedback visuel temporaire (highlight)
    this.showClickFeedback(x);
  }

  /**
   * Affiche un feedback visuel temporaire lors du clic
   */
  private showClickFeedback(x: number): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const height = canvas.height / dpr;

    // Dessiner un flash temporaire
    ctx.save();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'; // Bleu primaire avec transparence
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    ctx.restore();

    // Le flash disparaîtra naturellement lors du prochain redraw
    // Forcer un redraw après un court délai si pas en lecture
    if (!this.audioPlayerService.isPlaying()) {
      setTimeout(() => {
        this.redrawWaveform();
      }, 150);
    }
  }
}

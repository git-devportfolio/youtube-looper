import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WaveformService, AudioPlayerService, ToneEngineService } from '../../services';

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
  private readonly toneEngineService = inject(ToneEngineService);
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

    // Effect pour régénérer la waveform lors du changement de buffer
    // (détecté par le changement de duration dans ToneEngineService)
    effect(() => {
      const duration = this.toneEngineService.duration();

      // Vérifier que le canvas est initialisé et qu'il y a une durée valide
      if (!this.canvasInitialized || duration === 0) {
        return;
      }

      // Régénérer la waveform avec le nouveau buffer
      this.regenerateWaveform();
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

    if (!container) return;

    // Récupérer les dimensions réelles du conteneur
    const rect = container.getBoundingClientRect();
    const containerWidth = Math.floor(rect.width);
    const containerHeight = Math.floor(rect.height);

    // Adapter pour les écrans haute résolution
    const dpr = window.devicePixelRatio || 1;

    // Définir les dimensions du canvas avec DPR
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;

    // Appliquer les dimensions CSS (taille d'affichage)
    canvas.style.width = containerWidth + 'px';
    canvas.style.height = containerHeight + 'px';

    // Mettre à l'échelle le contexte pour compenser le DPR
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    console.log(`[WaveformDisplay] Canvas initialized: ${containerWidth}x${containerHeight} (DPR: ${dpr}, Canvas: ${canvas.width}x${canvas.height})`);
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
      const container = canvas.parentElement;

      if (!container) {
        console.error('[WaveformDisplay] No container found');
        return;
      }

      // Utiliser la largeur réelle du conteneur (en pixels CSS)
      const rect = container.getBoundingClientRect();
      const targetWidth = Math.floor(rect.width);

      console.log(`[WaveformDisplay] Generating waveform for width: ${targetWidth}px`);

      await this.waveformService.generateWaveform(audioBuffer, targetWidth);
      this.redrawWaveform();
    } catch (error) {
      console.error('Erreur lors de la génération de la waveform:', error);
    }
  }

  /**
   * Régénère la waveform avec le buffer actuel de ToneEngineService
   * Cette méthode est appelée automatiquement quand le buffer audio change
   * (par exemple après un traitement Rubberband)
   */
  private async regenerateWaveform(): Promise<void> {
    try {
      // Récupérer le buffer actuel depuis ToneEngineService
      const player = (this.toneEngineService as any).player;

      if (!player || !player.buffer) {
        console.warn('[WaveformDisplay] No player or buffer available for regeneration');
        return;
      }

      const newBuffer = player.buffer.get() as AudioBuffer;

      if (!newBuffer) {
        console.warn('[WaveformDisplay] Failed to get AudioBuffer from player');
        return;
      }

      console.log('[WaveformDisplay] Regenerating waveform with new buffer', {
        duration: newBuffer.duration,
        sampleRate: newBuffer.sampleRate,
        channels: newBuffer.numberOfChannels
      });

      // Régénérer la waveform avec le nouveau buffer
      await this.generateAndDrawWaveform(newBuffer);

      // Note: Les marqueurs A/B et la position du curseur sont préservés
      // car redrawWaveform() utilise les signals du service qui restent inchangés

    } catch (error) {
      console.error('[WaveformDisplay] Error regenerating waveform:', error);
    }
  }

  /**
   * Redessine la waveform avec la zone de boucle, les marqueurs A/B et le curseur de lecture
   */
  private redrawWaveform(): void {
    if (this.peaks().length > 0) {
      const canvas = this.canvasRef.nativeElement;
      this.waveformService.drawWaveform(canvas);
      this.drawLoopRegion();
      this.drawLoopMarkers();
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
   * Dessine la zone colorée entre les points A et B
   */
  private drawLoopRegion(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const duration = this.audioPlayerService.duration();
    if (duration === 0) return;

    const loopStart = this.toneEngineService.loopStart();
    const loopEnd = this.toneEngineService.loopEnd();

    // Ne dessiner que si les deux points sont définis
    if (loopStart === null || loopEnd === null) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    const regionStartX = (loopStart / duration) * width;
    const regionEndX = (loopEnd / duration) * width;
    const regionWidth = regionEndX - regionStartX;

    // Dessiner la zone semi-transparente
    ctx.save();

    // Si la boucle est active, utiliser une couleur plus intense
    const isLooping = this.toneEngineService.isLooping();
    const fillColor = isLooping
      ? 'rgba(34, 197, 94, 0.15)'  // Vert plus intense si actif
      : 'rgba(59, 130, 246, 0.1)';  // Bleu léger si inactif

    ctx.fillStyle = fillColor;
    ctx.fillRect(regionStartX, 0, regionWidth, height);

    // Ajouter un dégradé sur les bords pour un effet visuel
    const gradientLeft = ctx.createLinearGradient(regionStartX, 0, regionStartX + 20, 0);
    gradientLeft.addColorStop(0, isLooping ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.2)');
    gradientLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradientLeft;
    ctx.fillRect(regionStartX, 0, 20, height);

    const gradientRight = ctx.createLinearGradient(regionEndX - 20, 0, regionEndX, 0);
    gradientRight.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradientRight.addColorStop(1, isLooping ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.2)');
    ctx.fillStyle = gradientRight;
    ctx.fillRect(regionEndX - 20, 0, 20, height);

    ctx.restore();
  }

  /**
   * Dessine les marqueurs A et B de la boucle sur la waveform
   */
  private drawLoopMarkers(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const duration = this.audioPlayerService.duration();
    if (duration === 0) return;

    const loopStart = this.toneEngineService.loopStart();
    const loopEnd = this.toneEngineService.loopEnd();

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Dessiner le marqueur A (vert)
    if (loopStart !== null) {
      const markerAX = (loopStart / duration) * width;

      ctx.save();
      ctx.strokeStyle = '#22c55e'; // Vert
      ctx.lineWidth = 2;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 4;

      // Ligne verticale
      ctx.beginPath();
      ctx.moveTo(markerAX, 0);
      ctx.lineTo(markerAX, height);
      ctx.stroke();

      // Label 'A' en haut
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('A', markerAX + 4, 4);

      // Triangle en haut
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(markerAX, 0);
      ctx.lineTo(markerAX - 6, 10);
      ctx.lineTo(markerAX + 6, 10);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Dessiner le marqueur B (bleu)
    if (loopEnd !== null) {
      const markerBX = (loopEnd / duration) * width;

      ctx.save();
      ctx.strokeStyle = '#3b82f6'; // Bleu
      ctx.lineWidth = 2;
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 4;

      // Ligne verticale
      ctx.beginPath();
      ctx.moveTo(markerBX, 0);
      ctx.lineTo(markerBX, height);
      ctx.stroke();

      // Label 'B' en haut
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('B', markerBX - 4, 4);

      // Triangle en haut
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(markerBX, 0);
      ctx.lineTo(markerBX - 6, 10);
      ctx.lineTo(markerBX + 6, 10);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
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

import { Component, input, output, computed, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoriteModel } from '../../data/interfaces';

/**
 * Composant carte pour afficher un favori audio avec waveform miniature
 */
@Component({
  selector: 'app-favorite-card',
  imports: [CommonModule],
  templateUrl: './favorite-card.component.html',
  styleUrl: './favorite-card.component.scss'
})
export class FavoriteCardComponent implements AfterViewInit {
  @ViewChild('miniWaveform', { static: false }) canvasRef?: ElementRef<HTMLCanvasElement>;

  // Inputs
  readonly favorite = input.required<FavoriteModel>();

  // Outputs
  readonly play = output<FavoriteModel>();
  readonly delete = output<string>();

  // Computed properties
  readonly hasActivePitch = computed(() => this.favorite().settings.pitch !== 0);
  readonly hasActiveSpeed = computed(() => this.favorite().settings.playbackRate !== 1.0);
  readonly hasActiveLoop = computed(() => this.favorite().settings.loopEnabled);

  readonly formattedDate = computed(() => {
    const date = new Date(this.favorite().timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  });

  readonly formattedSize = computed(() => {
    const sizeBytes = this.favorite().size;
    if (sizeBytes < 1024 * 1024) {
      return `${Math.round(sizeBytes / 1024)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  });

  readonly formattedDuration = computed(() => {
    const totalSeconds = Math.floor(this.favorite().duration);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  constructor() {
    // Effect pour redessiner la waveform quand le favori change
    effect(() => {
      const fav = this.favorite();
      if (this.canvasRef && fav.audioData) {
        this.drawMiniWaveform();
      }
    });
  }

  ngAfterViewInit(): void {
    // Dessiner la waveform miniature après l'initialisation de la vue
    if (this.canvasRef) {
      this.drawMiniWaveform();
    }
  }

  /**
   * Émets l'événement pour jouer ce favori
   */
  onPlay(): void {
    this.play.emit(this.favorite());
  }

  /**
   * Émets l'événement pour supprimer ce favori
   */
  onDelete(): void {
    this.delete.emit(this.favorite().id);
  }

  /**
   * Dessine une waveform miniature simplifiée
   */
  private async drawMiniWaveform(): Promise<void> {
    if (!this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Décoder les données audio Base64
      const audioData = this.favorite().audioData;
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Créer un AudioContext pour décoder
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

      // Calculer les dimensions
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // Nettoyer le canvas
      ctx.clearRect(0, 0, width, height);

      // Extraire les peaks (version simplifiée)
      const channelData = audioBuffer.getChannelData(0);
      const samplesPerBar = Math.floor(channelData.length / width);
      const peaks: number[] = [];

      for (let i = 0; i < width; i++) {
        const start = i * samplesPerBar;
        const end = start + samplesPerBar;
        let max = 0;

        for (let j = start; j < end && j < channelData.length; j++) {
          max = Math.max(max, Math.abs(channelData[j]));
        }

        peaks.push(max);
      }

      // Dessiner les barres de la waveform
      const barWidth = 2;
      const barGap = 1;
      const totalBarWidth = barWidth + barGap;

      ctx.fillStyle = '#4ade80'; // Couleur primaire verte

      for (let i = 0; i < peaks.length; i++) {
        const x = i * totalBarWidth;
        const barHeight = peaks[i] * height;
        const y = (height - barHeight) / 2;

        ctx.fillRect(x, y, barWidth, barHeight);
      }

      // Fermer le contexte audio pour libérer les ressources
      await audioContext.close();

    } catch (error) {
      console.error('Erreur lors du dessin de la waveform miniature:', error);
      // Dessiner un placeholder en cas d'erreur
      this.drawPlaceholder(ctx, canvas.clientWidth, canvas.clientHeight);
    }
  }

  /**
   * Dessine un placeholder simple en cas d'erreur
   */
  private drawPlaceholder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Waveform', width / 2, height / 2);
  }
}

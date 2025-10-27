import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WaveformService {
  // Signals pour la waveform
  readonly waveformData = signal<Float32Array | null>(null);
  readonly peaks = signal<number[]>([]);
  readonly canvasWidth = signal<number>(0);
  readonly canvasHeight = signal<number>(0);
  readonly isGenerating = signal<boolean>(false);

  constructor() {}

  /**
   * Génère la waveform à partir d'un AudioBuffer
   */
  async generateWaveform(audioBuffer: AudioBuffer, targetWidth: number = 1000): Promise<void> {
    this.isGenerating.set(true);

    try {
      // Obtenir les données du premier canal (mono ou canal gauche en stéréo)
      const channelData = audioBuffer.getChannelData(0);
      this.waveformData.set(channelData);

      // Calculer les peaks pour le rendu
      const peaks = this.calculatePeaks(channelData, targetWidth);
      this.peaks.set(peaks);

      this.isGenerating.set(false);
    } catch (error) {
      console.error('Erreur lors de la génération de la waveform:', error);
      this.isGenerating.set(false);
      throw error;
    }
  }

  /**
   * Dessine la waveform sur un canvas
   */
  drawWaveform(canvas: HTMLCanvasElement, color: string = '#3b82f6'): void {
    const peaks = this.peaks();
    if (!peaks || peaks.length === 0) {
      console.warn('Aucune donnée de waveform à afficher');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Impossible d\'obtenir le contexte 2D du canvas');
      return;
    }

    // Utiliser les dimensions CSS (logiques) car le contexte est déjà mis à l'échelle
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const halfHeight = height / 2;

    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);

    // Configurer le style
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // Calculer la largeur de chaque barre
    const barWidth = width / peaks.length;

    // Dessiner les barres de la waveform
    peaks.forEach((peak, i) => {
      const x = i * barWidth;
      const barHeight = Math.max(1, Math.abs(peak) * halfHeight);

      // Dessiner la barre (symétrique autour du centre)
      ctx.fillRect(x, halfHeight - barHeight, barWidth, barHeight * 2);
    });

    // Mettre à jour les dimensions (en pixels logiques)
    this.canvasWidth.set(width);
    this.canvasHeight.set(height);
  }

  /**
   * Calcule les peaks pour la visualisation
   */
  private calculatePeaks(channelData: Float32Array, targetSamples: number): number[] {
    const sampleSize = Math.floor(channelData.length / targetSamples);
    const peaks: number[] = [];

    for (let i = 0; i < targetSamples; i++) {
      const start = i * sampleSize;
      const end = Math.min(start + sampleSize, channelData.length);
      let max = 0;

      // Trouver le pic maximum dans ce segment
      for (let j = start; j < end; j++) {
        const value = Math.abs(channelData[j]);
        if (value > max) {
          max = value;
        }
      }

      peaks.push(max);
    }

    return peaks;
  }

  /**
   * Dessine une waveform simplifiée pendant le chargement
   */
  drawPlaceholder(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Utiliser les dimensions CSS (logiques) car le contexte est déjà mis à l'échelle
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const halfHeight = height / 2;

    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);

    // Dessiner une ligne horizontale au centre
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, halfHeight);
    ctx.lineTo(width, halfHeight);
    ctx.stroke();
  }

  /**
   * Efface la waveform
   */
  clearWaveform(): void {
    this.waveformData.set(null);
    this.peaks.set([]);
    this.isGenerating.set(false);
  }

  /**
   * Obtient la position temporelle à partir d'une position X sur le canvas
   */
  getTimeFromX(x: number, duration: number): number {
    const width = this.canvasWidth();
    if (width === 0) return 0;

    return (x / width) * duration;
  }

  /**
   * Obtient la position X sur le canvas à partir d'un temps
   */
  getXFromTime(time: number, duration: number): number {
    const width = this.canvasWidth();
    if (duration === 0) return 0;

    return (time / duration) * width;
  }
}

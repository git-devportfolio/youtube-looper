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

  constructor() {}

  // Méthodes pour générer et afficher la waveform
  generateWaveform(audioBuffer: AudioBuffer): void {
    const channelData = audioBuffer.getChannelData(0); // Premier canal
    this.waveformData.set(channelData);
    throw new Error('Not implemented');
  }

  drawWaveform(canvas: HTMLCanvasElement): void {
    throw new Error('Not implemented');
  }

  calculatePeaks(samples: number): number[] {
    throw new Error('Not implemented');
  }

  clearWaveform(): void {
    this.waveformData.set(null);
    this.peaks.set([]);
  }
}

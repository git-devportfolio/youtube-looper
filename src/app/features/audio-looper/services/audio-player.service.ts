import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioPlayerService {
  private readonly audioContext = new AudioContext();

  // Signals pour l'état audio
  readonly isPlaying = signal<boolean>(false);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);
  readonly volume = signal<number>(100);
  readonly isMuted = signal<boolean>(false);

  constructor() {}

  // Méthodes à implémenter
  loadAudioFile(file: File): Promise<void> {
    throw new Error('Not implemented');
  }

  play(): void {
    throw new Error('Not implemented');
  }

  pause(): void {
    throw new Error('Not implemented');
  }

  seekTo(time: number): void {
    throw new Error('Not implemented');
  }

  setVolume(volume: number): void {
    throw new Error('Not implemented');
  }

  toggleMute(): void {
    throw new Error('Not implemented');
  }
}

import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToneEngineService {
  // Signals pour les contrôles audio
  readonly pitch = signal<number>(0); // -6 à +6 demi-tons
  readonly playbackRate = signal<number>(1.0); // 0.5x, 0.75x, 1.0x
  readonly loopStart = signal<number | null>(null);
  readonly loopEnd = signal<number | null>(null);
  readonly isLooping = signal<boolean>(false);

  constructor() {}

  // Méthodes pour Tone.js (à implémenter après installation)
  setPitch(semitones: number): void {
    this.pitch.set(semitones);
    throw new Error('Not implemented - requires Tone.js');
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate.set(rate);
    throw new Error('Not implemented - requires Tone.js');
  }

  setLoopPoints(start: number, end: number): void {
    this.loopStart.set(start);
    this.loopEnd.set(end);
    throw new Error('Not implemented - requires Tone.js');
  }

  toggleLoop(): void {
    this.isLooping.update(v => !v);
    throw new Error('Not implemented - requires Tone.js');
  }

  resetPitch(): void {
    this.pitch.set(0);
  }

  resetLoop(): void {
    this.loopStart.set(null);
    this.loopEnd.set(null);
    this.isLooping.set(false);
  }
}

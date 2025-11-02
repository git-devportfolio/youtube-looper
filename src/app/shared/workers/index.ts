// Barrel export for workers and types
export * from './mp3-encoder.types';

// Note: Web Workers are loaded differently than regular modules
// Use: new Worker(new URL('./mp3-encoder.worker', import.meta.url), { type: 'module' })

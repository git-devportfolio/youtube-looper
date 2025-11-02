/**
 * Types pour le Web Worker d'encodage MP3
 */

/**
 * Données de l'AudioBuffer sérialisées pour envoi au worker
 */
export interface AudioBufferData {
  channelData: Float32Array[];
  sampleRate: number;
  numberOfChannels: number;
  length: number;
}

/**
 * Message pour démarrer l'encodage
 */
export interface EncodeMessage {
  type: 'encode';
  audioBuffer: AudioBufferData;
}

/**
 * Message de progression de l'encodage
 */
export interface ProgressMessage {
  type: 'progress';
  progress: number; // 0-100
}

/**
 * Message de complétion avec les données MP3
 */
export interface CompleteMessage {
  type: 'complete';
  mp3Data: Int8Array[];
}

/**
 * Message d'erreur
 */
export interface ErrorMessage {
  type: 'error';
  error: string;
}

/**
 * Union de tous les messages sortants du worker
 */
export type Mp3EncoderWorkerMessage = ProgressMessage | CompleteMessage | ErrorMessage;

/**
 * Helper pour convertir un AudioBuffer en AudioBufferData sérialisable
 */
export function serializeAudioBuffer(buffer: AudioBuffer): AudioBufferData {
  const channelData: Float32Array[] = [];

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }

  return {
    channelData,
    sampleRate: buffer.sampleRate,
    numberOfChannels: buffer.numberOfChannels,
    length: buffer.length
  };
}

/**
 * Helper pour créer un Blob MP3 à partir des chunks encodés
 */
export function createMp3Blob(mp3Data: Int8Array[]): Blob {
  return new Blob(mp3Data, { type: 'audio/mp3' });
}

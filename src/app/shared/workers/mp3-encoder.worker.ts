/// <reference lib="webworker" />

/**
 * Web Worker pour l'encodage MP3 avec lamejs
 *
 * Ce worker reçoit un AudioBuffer et l'encode en MP3 en envoyant des événements
 * de progression. Il gère la conversion Float32Array vers Int16Array et
 * l'encodage avec lamejs.
 *
 * Messages entrants :
 * - { type: 'encode', audioBuffer: AudioBufferData, sampleRate: number, numberOfChannels: number }
 *
 * Messages sortants :
 * - { type: 'progress', progress: number } // 0-100
 * - { type: 'complete', mp3Data: Int8Array[] }
 * - { type: 'error', error: string }
 */

// Charger lamejs dans le contexte du worker
// @ts-ignore - importScripts est disponible dans le contexte worker
importScripts('/lame.all.js');

// Interface pour les données de l'AudioBuffer sérialisées
interface AudioBufferData {
  channelData: Float32Array[];
  sampleRate: number;
  numberOfChannels: number;
  length: number;
}

// Interface pour les messages reçus
interface EncodeMessage {
  type: 'encode';
  audioBuffer: AudioBufferData;
}

// Déclarer les types lamejs
declare const lamejs: {
  Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => {
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
    flush(): Int8Array;
  };
};

/**
 * Convertit un tableau Float32Array (-1.0 à 1.0) en Int16Array (-32768 à 32767)
 * @param buffer - Tableau de samples audio en format float
 * @returns Tableau de samples audio en format int16
 */
function floatTo16BitPCM(buffer: Float32Array): Int16Array {
  const output = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    // Clamp la valeur entre -1 et 1
    const s = Math.max(-1, Math.min(1, buffer[i]));
    // Convertir en Int16 (-32768 à 32767)
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

/**
 * Encode un AudioBuffer en MP3
 * @param audioBuffer - Données de l'AudioBuffer à encoder
 */
function encodeToMp3(audioBuffer: AudioBufferData): void {
  try {
    const { channelData, sampleRate, numberOfChannels, length } = audioBuffer;

    // Configuration de l'encodeur MP3 : 192 kbps
    const kbps = 192;
    const mp3encoder = new lamejs.Mp3Encoder(numberOfChannels, sampleRate, kbps);

    // Tableau pour stocker les chunks MP3 encodés
    const mp3Data: Int8Array[] = [];

    // Taille des chunks pour le traitement (1152 samples = taille de frame MP3)
    const maxSamples = 1152;
    const totalSamples = length;
    let processedSamples = 0;

    // Convertir les Float32Array en Int16Array
    const channels16bit = channelData.map(channel => floatTo16BitPCM(channel));

    // Encoder par chunks
    for (let i = 0; i < totalSamples; i += maxSamples) {
      const end = Math.min(i + maxSamples, totalSamples);
      const chunkSize = end - i;

      if (numberOfChannels === 1) {
        // Mono
        const monoChunk = channels16bit[0].subarray(i, end);
        const mp3buf = mp3encoder.encodeBuffer(monoChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      } else {
        // Stéréo
        const leftChunk = channels16bit[0].subarray(i, end);
        const rightChunk = channels16bit[1].subarray(i, end);
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }

      processedSamples += chunkSize;

      // Envoyer la progression
      const progress = Math.round((processedSamples / totalSamples) * 100);
      postMessage({ type: 'progress', progress });
    }

    // Finaliser l'encodage
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }

    // Envoyer les données MP3 complètes
    postMessage({ type: 'complete', mp3Data });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during MP3 encoding';
    postMessage({ type: 'error', error: errorMessage });
  }
}

// Écouter les messages du thread principal
addEventListener('message', ({ data }: MessageEvent<EncodeMessage>) => {
  if (data.type === 'encode') {
    encodeToMp3(data.audioBuffer);
  }
});

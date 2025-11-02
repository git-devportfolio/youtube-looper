import { Injectable } from '@angular/core';
import {
  serializeAudioBuffer,
  createMp3Blob,
  Mp3EncoderWorkerMessage,
  EncodeMessage
} from '../workers';

/**
 * Service de test pour le Web Worker d'encodage MP3
 * Ce service peut être supprimé après validation de l'intégration
 */
@Injectable({
  providedIn: 'root'
})
export class Mp3WorkerTestService {

  /**
   * Crée un AudioBuffer factice pour les tests
   * Génère 2 secondes de ton à 440 Hz (note LA)
   */
  private createTestAudioBuffer(audioContext: AudioContext): AudioBuffer {
    const sampleRate = 44100;
    const duration = 2; // 2 secondes
    const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);

    // Générer un ton de 440 Hz (note LA)
    const frequency = 440;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      }
    }

    return buffer;
  }

  /**
   * Test basique du worker MP3
   * Encode 2 secondes de ton en MP3 et vérifie le résultat
   */
  async testMp3Worker(): Promise<boolean> {
    try {
      console.log('🧪 Starting MP3 Worker test...');

      // Créer un AudioContext et un buffer de test
      const audioContext = new AudioContext();
      const testBuffer = this.createTestAudioBuffer(audioContext);

      console.log(`   Test buffer: ${testBuffer.duration}s, ${testBuffer.numberOfChannels} channels, ${testBuffer.sampleRate} Hz`);

      // Créer le worker en mode classic pour supporter importScripts()
      const worker = new Worker(
        new URL('../workers/mp3-encoder.worker', import.meta.url),
        { type: 'classic' }
      );

      // Promise pour attendre le résultat
      const result = await new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Worker timeout after 10 seconds'));
        }, 10000);

        worker.onmessage = ({ data }: MessageEvent<Mp3EncoderWorkerMessage>) => {
          if (data.type === 'progress') {
            console.log(`   Encoding progress: ${data.progress}%`);
          } else if (data.type === 'complete') {
            clearTimeout(timeout);
            console.log(`   Encoding complete: ${data.mp3Data.length} chunks`);

            // Créer le blob MP3
            const mp3Blob = createMp3Blob(data.mp3Data);
            console.log(`   MP3 Blob size: ${(mp3Blob.size / 1024).toFixed(2)} KB`);

            // Vérifier que le blob n'est pas vide
            if (mp3Blob.size > 0) {
              console.log('✅ MP3 Worker test passed: Successfully encoded audio to MP3');
              worker.terminate();
              resolve(true);
            } else {
              console.error('❌ MP3 Worker test failed: Empty MP3 blob');
              worker.terminate();
              resolve(false);
            }
          } else if (data.type === 'error') {
            clearTimeout(timeout);
            console.error('❌ MP3 Worker test failed:', data.error);
            worker.terminate();
            resolve(false);
          }
        };

        worker.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ MP3 Worker test failed with error:', error);
          worker.terminate();
          resolve(false);
        };

        // Envoyer le buffer au worker
        const audioBufferData = serializeAudioBuffer(testBuffer);
        const message: EncodeMessage = {
          type: 'encode',
          audioBuffer: audioBufferData
        };

        worker.postMessage(message);
      });

      // Fermer l'AudioContext
      await audioContext.close();

      return result;

    } catch (error) {
      console.error('❌ MP3 Worker test failed with exception:', error);
      return false;
    }
  }

  /**
   * Exécute tous les tests du worker MP3
   */
  async runAllTests(): Promise<boolean> {
    console.log('🧪 Running MP3 Worker integration tests...');

    const workerTest = await this.testMp3Worker();

    if (workerTest) {
      console.log('✅ All MP3 Worker tests passed!');
    } else {
      console.error('❌ MP3 Worker tests failed');
    }

    return workerTest;
  }
}

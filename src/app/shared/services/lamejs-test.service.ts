import { Injectable } from '@angular/core';

/**
 * Service de test pour vérifier l'installation et le fonctionnement de lamejs
 * Ce service peut être supprimé après validation de l'intégration
 *
 * Note: lamejs est chargé comme script global via angular.json
 */
@Injectable({
  providedIn: 'root'
})
export class LamejsTestService {

  /**
   * Test basique d'encodage MP3
   * Encode 1 seconde de silence en MP3 pour vérifier que lamejs fonctionne
   * @returns true si l'encodage réussit, false sinon
   */
  testBasicEncoding(): boolean {
    try {
      // Configuration: mono, 44.1kHz, 128kbps
      const channels = 1;
      const sampleRate = 44100;
      const kbps = 128;

      // Créer l'encodeur en utilisant la variable globale lamejs
      const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);

      // Créer 1 seconde de silence (44100 samples à 44.1kHz)
      const samples = new Int16Array(44100);

      // Tableau pour stocker les données MP3
      const mp3Data: Int8Array[] = [];

      // Encoder les samples
      const mp3Buffer = mp3encoder.encodeBuffer(samples);
      if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer);
      }

      // Finaliser l'encodage
      const mp3Flush = mp3encoder.flush();
      if (mp3Flush.length > 0) {
        mp3Data.push(mp3Flush);
      }

      // Vérifier que des données MP3 ont été générées
      const hasData = mp3Data.length > 0 && mp3Data.some(chunk => chunk.length > 0);

      if (hasData) {
        console.log('✅ lamejs test passed: Successfully encoded 1 second of silence to MP3');
        console.log(`   Generated ${mp3Data.length} MP3 chunks`);
        return true;
      } else {
        console.error('❌ lamejs test failed: No MP3 data generated');
        return false;
      }

    } catch (error) {
      console.error('❌ lamejs test failed with error:', error);
      return false;
    }
  }

  /**
   * Test d'encodage stéréo
   * @returns true si l'encodage stéréo réussit, false sinon
   */
  testStereoEncoding(): boolean {
    try {
      // Configuration: stéréo, 44.1kHz, 192kbps
      const channels = 2;
      const sampleRate = 44100;
      const kbps = 192;

      const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);

      // Créer des canaux gauche et droit
      const leftChannel = new Int16Array(44100);
      const rightChannel = new Int16Array(44100);

      const mp3Data: Int8Array[] = [];

      // Encoder en stéréo
      const mp3Buffer = mp3encoder.encodeBuffer(leftChannel, rightChannel);
      if (mp3Buffer.length > 0) {
        mp3Data.push(mp3Buffer);
      }

      const mp3Flush = mp3encoder.flush();
      if (mp3Flush.length > 0) {
        mp3Data.push(mp3Flush);
      }

      const hasData = mp3Data.length > 0;

      if (hasData) {
        console.log('✅ lamejs stereo test passed: Successfully encoded stereo audio');
        return true;
      } else {
        console.error('❌ lamejs stereo test failed: No MP3 data generated');
        return false;
      }

    } catch (error) {
      console.error('❌ lamejs stereo test failed with error:', error);
      return false;
    }
  }

  /**
   * Exécute tous les tests lamejs
   * @returns true si tous les tests passent, false sinon
   */
  runAllTests(): boolean {
    console.log('🧪 Running lamejs integration tests...');

    const monoTest = this.testBasicEncoding();
    const stereoTest = this.testStereoEncoding();

    const allPassed = monoTest && stereoTest;

    if (allPassed) {
      console.log('✅ All lamejs tests passed!');
    } else {
      console.error('❌ Some lamejs tests failed');
    }

    return allPassed;
  }
}

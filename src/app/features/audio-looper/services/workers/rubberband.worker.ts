/// <reference lib="webworker" />

import type { RubberbandWorkerInput, RubberbandWorkerOutput } from './rubberband-worker.types';

/**
 * Web Worker pour le traitement audio avec rubberband-wasm
 * Gère le pitch shifting et le time stretching en temps réel
 */

// Interface pour l'API Rubberband (basée sur rubberband-wasm)
interface RubberbandAPI {
  rubberband_new(sampleRate: number, channels: number, options: number, initialTimeRatio: number, initialPitchScale: number): number;
  rubberband_delete(state: number): void;
  rubberband_set_pitch_scale(state: number, scale: number): void;
  rubberband_set_time_ratio(state: number, ratio: number): void;
  rubberband_get_samples_required(state: number): number;
  rubberband_set_expected_input_duration(state: number, samples: number): void;
  rubberband_study(state: number, input: number, samples: number, final: number): void;
  rubberband_process(state: number, input: number, samples: number, final: number): void;
  rubberband_available(state: number): number;
  rubberband_retrieve(state: number, output: number, samples: number): number;
  malloc(size: number): number;
  free(ptr: number): void;
  memWrite(ptr: number, data: Float32Array): void;
  memWritePtr(ptr: number, value: number): void;
  memReadF32(ptr: number, length: number): Float32Array;
}

// Module rubberband global
declare const rubberband: {
  RubberBandInterface: {
    initialize(wasm: WebAssembly.Module): Promise<RubberbandAPI>;
  };
};

let rbApi: RubberbandAPI | null = null;

/**
 * Initialisation asynchrone du module rubberband-wasm
 */
(async () => {
  try {
    console.time('[RubberbandWorker] WASM compile');

    // Charger le fichier JavaScript UMD de rubberband
    importScripts('/assets/rubberband/rubberband.umd.min.js');

    // Compiler le module WASM
    const wasm = await WebAssembly.compileStreaming(
      fetch('/assets/rubberband/rubberband.wasm')
    );

    // Initialiser l'API Rubberband
    rbApi = await rubberband.RubberBandInterface.initialize(wasm);

    console.timeEnd('[RubberbandWorker] WASM compile');

    // Notifier que le worker est prêt
    const readyMessage: RubberbandWorkerOutput = { ready: true };
    postMessage(readyMessage);
  } catch (error) {
    console.error('[RubberbandWorker] Initialization error:', error);
    const errorMessage: RubberbandWorkerOutput = {
      error: `Failed to initialize rubberband-wasm: ${error instanceof Error ? error.message : String(error)}`
    };
    postMessage(errorMessage);
  }
})();

/**
 * Gestionnaire de messages du worker
 */
onmessage = async function (e: MessageEvent<RubberbandWorkerInput>) {
  console.log('[RubberbandWorker] Message received from main script', e.data);

  // Vérifier que l'API est initialisée
  if (!rbApi) {
    const errorMessage: RubberbandWorkerOutput = {
      error: 'Rubberband API not initialized yet'
    };
    postMessage(errorMessage);
    return;
  }

  try {
    const { channelBuffers, sampleRate, pitch, tempo } = e.data;

    // Validation des entrées
    if (!channelBuffers || channelBuffers.length === 0) {
      throw new Error('No channel buffers provided');
    }
    if (sampleRate <= 0) {
      throw new Error('Invalid sample rate');
    }
    if (tempo <= 0) {
      throw new Error('Invalid tempo value');
    }

    // Calculer la taille du buffer de sortie en fonction du tempo
    const outputSamples = Math.ceil(channelBuffers[0].length * tempo);
    const outputBuffers = channelBuffers.map(() => new Float32Array(outputSamples));

    // Créer l'état Rubberband
    // rubberband_new(sampleRate, channels, options, initialTimeRatio, initialPitchScale)
    const rbState = rbApi.rubberband_new(sampleRate, channelBuffers.length, 0, 1, 1);

    // Convertir le pitch de demi-tons en échelle (2^(pitch/12))
    const pitchScale = Math.pow(2, pitch / 12);
    rbApi.rubberband_set_pitch_scale(rbState, pitchScale);
    rbApi.rubberband_set_time_ratio(rbState, tempo);

    const samplesRequired = rbApi.rubberband_get_samples_required(rbState);

    // Allouer de la mémoire pour les pointeurs de canaux
    const channelArrayPtr = rbApi.malloc(channelBuffers.length * 4);
    const channelDataPtr: number[] = [];

    for (let channel = 0; channel < channelBuffers.length; channel++) {
      const bufferPtr = rbApi.malloc(samplesRequired * 4);
      channelDataPtr.push(bufferPtr);
      rbApi.memWritePtr(channelArrayPtr + channel * 4, bufferPtr);
    }

    // Définir la durée d'entrée attendue
    rbApi.rubberband_set_expected_input_duration(rbState, channelBuffers[0].length);

    // Système de throttling pour les messages de progression
    let lastReport = Date.now();
    const reportProgress = (callback: () => number) => {
      if (Date.now() - lastReport > 250) {
        const progressMessage: RubberbandWorkerOutput = {
          progress: Math.round(callback() * 100)
        };
        postMessage(progressMessage);
        lastReport = Date.now();
      }
    };

    // PHASE STUDY (0-50%)
    const studyMessage: RubberbandWorkerOutput = {
      status: 'Studying...',
      progress: 0
    };
    postMessage(studyMessage);

    console.time('[RubberbandWorker] study');
    let read = 0;

    while (read < channelBuffers[0].length) {
      // Progression de 0 à 0.5 (50%)
      reportProgress(() => (read / channelBuffers[0].length) * 0.5);

      // Copier les données audio dans la mémoire du worker
      channelBuffers.forEach((buf, i) =>
        rbApi!.memWrite(channelDataPtr[i], buf.subarray(read, read + samplesRequired))
      );

      const remaining = Math.min(samplesRequired, channelBuffers[0].length - read);
      read += remaining;
      const isFinal = read >= channelBuffers[0].length;

      // Étudier l'audio (phase d'analyse)
      rbApi.rubberband_study(rbState, channelArrayPtr, remaining, isFinal ? 1 : 0);
    }

    console.timeEnd('[RubberbandWorker] study');

    // PHASE PROCESS (50-100%)
    const processMessage: RubberbandWorkerOutput = {
      status: 'Processing...',
      progress: 50
    };
    postMessage(processMessage);

    console.time('[RubberbandWorker] process');
    read = 0;
    let write = 0;

    // Fonction pour récupérer les échantillons traités
    const tryRetrieve = (final = false) => {
      while (true) {
        const available = rbApi!.rubberband_available(rbState);
        if (available < 1) break;
        if (!final && available < samplesRequired) break;

        const recv = rbApi!.rubberband_retrieve(
          rbState,
          channelArrayPtr,
          Math.min(samplesRequired, available)
        );

        channelDataPtr.forEach((ptr, i) => {
          const retrievedData = rbApi!.memReadF32(ptr, recv);
          outputBuffers[i].set(retrievedData, write);
        });

        write += recv;
      }
    };

    // Traiter l'audio
    while (read < channelBuffers[0].length) {
      // Progression de 0.5 à 1.0 (50% à 100%)
      reportProgress(() => 0.5 + (read / channelBuffers[0].length) * 0.5);

      channelBuffers.forEach((buf, i) =>
        rbApi!.memWrite(channelDataPtr[i], buf.subarray(read, read + samplesRequired))
      );

      const remaining = Math.min(samplesRequired, channelBuffers[0].length - read);
      read += remaining;
      const isFinal = read >= channelBuffers[0].length;

      rbApi.rubberband_process(rbState, channelArrayPtr, remaining, isFinal ? 1 : 0);
      tryRetrieve(false);
    }

    // Récupérer les derniers échantillons
    tryRetrieve(true);

    console.timeEnd('[RubberbandWorker] process');

    // Envoyer la progression finale
    const finalProgressMessage: RubberbandWorkerOutput = { progress: 100 };
    postMessage(finalProgressMessage);

    // Libérer la mémoire
    channelDataPtr.forEach((ptr) => rbApi!.free(ptr));
    rbApi.free(channelArrayPtr);
    rbApi.rubberband_delete(rbState);

    // Envoyer le résultat final
    const resultMessage: RubberbandWorkerOutput = {
      channelBuffers: outputBuffers
    };
    postMessage(resultMessage);

  } catch (error) {
    console.error('[RubberbandWorker] Processing error:', error);
    const errorMessage: RubberbandWorkerOutput = {
      error: `Audio processing failed: ${error instanceof Error ? error.message : String(error)}`
    };
    postMessage(errorMessage);
  }
};

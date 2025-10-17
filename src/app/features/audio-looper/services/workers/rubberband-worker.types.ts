/**
 * Interface pour les données d'entrée du Web Worker Rubberband
 */
export interface RubberbandWorkerInput {
  /** Tableaux de canaux audio (Float32Array pour chaque canal) */
  channelBuffers: Float32Array[];
  /** Taux d'échantillonnage de l'audio en Hz */
  sampleRate: number;
  /** Modification de la tonalité en demi-tons (-6 à +6) */
  pitch: number;
  /** Modification du tempo (vitesse) (0.5 à 2.0, 1.0 = vitesse normale) */
  tempo: number;
}

/**
 * Interface pour les données de sortie du Web Worker Rubberband
 */
export interface RubberbandWorkerOutput {
  /** Tableaux de canaux audio traités (optionnel, présent quand le traitement est terminé) */
  channelBuffers?: Float32Array[];
  /** Indique si le worker est prêt à recevoir des données (optionnel) */
  ready?: boolean;
  /** Statut du traitement (optionnel) */
  status?: string;
  /** Progression du traitement en pourcentage (0-100, optionnel) */
  progress?: number;
  /** Message d'erreur (optionnel, présent en cas d'erreur) */
  error?: string;
}

/**
 * Type definitions for lamejs 1.2.1
 * Project: https://github.com/zhuker/lamejs
 * Definitions by: Claude Code
 *
 * lamejs is loaded as a global script via angular.json scripts array
 */

/**
 * MP3 Encoder class for encoding audio data to MP3 format
 */
declare class Mp3Encoder {
  /**
   * Creates a new MP3 encoder
   * @param channels Number of channels (1 for mono, 2 for stereo)
   * @param sampleRate Sample rate in Hz (e.g., 44100)
   * @param kbps Bitrate in kbps (e.g., 128, 192)
   */
  constructor(channels: number, sampleRate: number, kbps: number);

  /**
   * Encodes a buffer of audio samples to MP3
   * For mono audio, provide only the samples parameter
   * For stereo audio, provide both left and right channel samples
   * @param samples Mono samples or left channel samples
   * @param right Optional right channel samples for stereo encoding
   * @returns Encoded MP3 data as Int8Array
   */
  encodeBuffer(samples: Int16Array, right?: Int16Array): Int8Array;

  /**
   * Finishes the encoding process and returns any remaining MP3 data
   * Must be called after all encodeBuffer calls to get the final MP3 data
   * @returns Final MP3 data as Int8Array
   */
  flush(): Int8Array;
}

/**
 * WavHeader utility class for reading WAV file headers
 */
declare class WavHeader {
  constructor();
  static readHeader(dataView: DataView): WavHeader;
  dataOffset: number;
  dataLen: number;
  channels: number;
  sampleRate: number;
}

/**
 * Global lamejs object exposed by lame.all.js
 */
declare const lamejs: {
  Mp3Encoder: typeof Mp3Encoder;
  WavHeader: typeof WavHeader;
};

import { Injectable, signal } from '@angular/core';

/**
 * Résultat de la détection de compatibilité
 */
export interface CompatibilityResult {
  /** WebAssembly est supporté */
  webAssemblySupported: boolean;
  /** Web Workers sont supportés */
  webWorkersSupported: boolean;
  /** AudioContext est supporté */
  audioContextSupported: boolean;
  /** Navigateur détecté */
  browser: string;
  /** Version du navigateur */
  browserVersion: string;
  /** Système d'exploitation */
  os: string;
  /** Est un appareil mobile */
  isMobile: boolean;
  /** Tous les requis sont supportés */
  isFullyCompatible: boolean;
  /** Messages d'avertissement */
  warnings: string[];
}

/**
 * Service de détection de compatibilité navigateur
 * Détecte le support WebAssembly, Web Workers, AudioContext
 * et fournit des informations sur le navigateur
 */
@Injectable({
  providedIn: 'root'
})
export class BrowserCompatibilityService {
  /**
   * Signal contenant les résultats de compatibilité
   */
  readonly compatibility = signal<CompatibilityResult | null>(null);

  /**
   * Signal indiquant si la détection a été effectuée
   */
  readonly isDetected = signal<boolean>(false);

  constructor() {
    // Effectuer la détection au démarrage
    this.detectCompatibility();
  }

  /**
   * Détecte la compatibilité du navigateur
   */
  detectCompatibility(): void {
    const warnings: string[] = [];

    // Détection WebAssembly
    const webAssemblySupported = this.detectWebAssembly();
    if (!webAssemblySupported) {
      warnings.push('WebAssembly is not supported. Audio pitch shifting will not work.');
    }

    // Détection Web Workers
    const webWorkersSupported = this.detectWebWorkers();
    if (!webWorkersSupported) {
      warnings.push('Web Workers are not supported. Audio processing performance may be degraded.');
    }

    // Détection AudioContext
    const audioContextSupported = this.detectAudioContext();
    if (!audioContextSupported) {
      warnings.push('Web Audio API is not supported. Audio playback will not work.');
    }

    // Détection du navigateur
    const browserInfo = this.detectBrowser();

    // Vérifications spécifiques par navigateur
    this.addBrowserSpecificWarnings(browserInfo, warnings);

    const result: CompatibilityResult = {
      webAssemblySupported,
      webWorkersSupported,
      audioContextSupported,
      browser: browserInfo.name,
      browserVersion: browserInfo.version,
      os: browserInfo.os,
      isMobile: browserInfo.isMobile,
      isFullyCompatible: webAssemblySupported && webWorkersSupported && audioContextSupported,
      warnings
    };

    this.compatibility.set(result);
    this.isDetected.set(true);

    // Logger les informations de compatibilité
    console.log('[BrowserCompatibility] Detection complete:', result);

    if (!result.isFullyCompatible) {
      console.warn('[BrowserCompatibility] Compatibility issues detected:', warnings);
    }
  }

  /**
   * Détecte le support WebAssembly
   */
  private detectWebAssembly(): boolean {
    try {
      if (typeof WebAssembly === 'object' &&
          typeof WebAssembly.instantiate === 'function') {
        // Test minimal WebAssembly
        const module = new WebAssembly.Module(
          Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
        );
        return module instanceof WebAssembly.Module;
      }
    } catch (error) {
      console.error('[BrowserCompatibility] WebAssembly test failed:', error);
    }
    return false;
  }

  /**
   * Détecte le support Web Workers
   */
  private detectWebWorkers(): boolean {
    return typeof Worker !== 'undefined';
  }

  /**
   * Détecte le support AudioContext
   */
  private detectAudioContext(): boolean {
    return typeof AudioContext !== 'undefined' ||
           typeof (window as any).webkitAudioContext !== 'undefined';
  }

  /**
   * Détecte le navigateur et ses informations
   */
  private detectBrowser(): {
    name: string;
    version: string;
    os: string;
    isMobile: boolean;
  } {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';
    let os = 'Unknown';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);

    // Détection OS
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iOS|iPhone|iPad|iPod/i.test(ua)) os = 'iOS';

    // Détection navigateur (ordre important)
    if (/Edg\//i.test(ua)) {
      name = 'Edge';
      const match = ua.match(/Edg\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (/Chrome/i.test(ua)) {
      name = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (/Firefox/i.test(ua)) {
      name = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      name = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
    }

    return { name, version, os, isMobile };
  }

  /**
   * Ajoute des avertissements spécifiques au navigateur
   */
  private addBrowserSpecificWarnings(
    browserInfo: { name: string; version: string; os: string; isMobile: boolean },
    warnings: string[]
  ): void {
    // Safari < 15 a des problèmes avec WebAssembly
    if (browserInfo.name === 'Safari' && parseInt(browserInfo.version) < 15) {
      warnings.push('Safari version is outdated. Please update to version 15 or later for better WebAssembly support.');
    }

    // Avertissement pour iOS Safari
    if (browserInfo.os === 'iOS' && browserInfo.name === 'Safari') {
      warnings.push('iOS Safari may have performance limitations. Consider using Chrome on iOS for better performance.');
    }

    // Firefox < 90 peut avoir des problèmes de performance
    if (browserInfo.name === 'Firefox' && parseInt(browserInfo.version) < 90) {
      warnings.push('Firefox version is outdated. Please update to version 90 or later for optimal performance.');
    }
  }

  /**
   * Retourne un message d'erreur formaté si le navigateur n'est pas compatible
   */
  getIncompatibilityMessage(): string | null {
    const compat = this.compatibility();
    if (!compat || compat.isFullyCompatible) {
      return null;
    }

    return `Your browser (${compat.browser} ${compat.browserVersion} on ${compat.os}) has compatibility issues:\n${compat.warnings.join('\n')}`;
  }
}

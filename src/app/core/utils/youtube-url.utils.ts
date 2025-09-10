/**
 * Utilitaires pour manipuler les URLs YouTube
 */

/**
 * Extrait l'ID de vidéo YouTube depuis une URL
 * Supporte différents formats d'URL YouTube
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Nettoyer l'URL
  url = url.trim();

  // Patterns pour différents formats d'URL YouTube
  const patterns = [
    // Format standard: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    
    // Format court: https://youtu.be/VIDEO_ID
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    
    // Format embed: https://www.youtube.com/embed/VIDEO_ID
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    
    // Format avec paramètres supplémentaires: https://www.youtube.com/watch?v=VIDEO_ID&t=123s
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    
    // Format mobile: https://m.youtube.com/watch?v=VIDEO_ID
    /(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    
    // Format sans protocole: youtube.com/watch?v=VIDEO_ID
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    
    // Juste l'ID de vidéo (11 caractères)
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Valide si une chaîne est un ID de vidéo YouTube valide
 */
export function isValidYouTubeVideoId(videoId: string): boolean {
  if (!videoId || typeof videoId !== 'string') {
    return false;
  }

  // Un ID YouTube valide fait exactement 11 caractères et contient uniquement
  // des lettres, chiffres, tirets et underscores
  const pattern = /^[a-zA-Z0-9_-]{11}$/;
  return pattern.test(videoId);
}

/**
 * Valide si une URL est une URL YouTube valide
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Convertit une URL YouTube en format standard
 */
export function normalizeYouTubeUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return null;
  }
  
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Génère une URL de miniature YouTube
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'medium'): string {
  if (!isValidYouTubeVideoId(videoId)) {
    throw new Error('ID de vidéo YouTube invalide');
  }

  const qualityMap = {
    'default': 'default',
    'medium': 'mqdefault',
    'high': 'hqdefault',
    'standard': 'sddefault',
    'maxres': 'maxresdefault'
  };

  const qualityParam = qualityMap[quality] || 'mqdefault';
  return `https://img.youtube.com/vi/${videoId}/${qualityParam}.jpg`;
}

/**
 * Crée une URL YouTube avec paramètres de temps
 */
export function createYouTubeUrlWithTime(videoId: string, startTime?: number, endTime?: number): string {
  if (!isValidYouTubeVideoId(videoId)) {
    throw new Error('ID de vidéo YouTube invalide');
  }

  let url = `https://www.youtube.com/watch?v=${videoId}`;
  
  if (startTime !== undefined && startTime > 0) {
    url += `&t=${Math.floor(startTime)}s`;
  }

  // Note: YouTube ne supporte pas nativement le paramètre end dans les URLs
  // mais nous gardons cette fonction pour une utilisation future ou des intégrations
  
  return url;
}

/**
 * Extrait le timestamp depuis une URL YouTube (paramètre t)
 */
export function extractYouTubeTimestamp(url: string): number | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Pattern pour extraire le paramètre de temps: &t=123s ou &t=123
  const timePatterns = [
    /[?&]t=(\d+)s/,  // Format avec 's' : &t=123s
    /[?&]t=(\d+)/,   // Format sans 's' : &t=123
    /[?&]start=(\d+)/ // Format alternatif : &start=123
  ];

  for (const pattern of timePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

/**
 * Informations extraites d'une URL YouTube
 */
export interface YouTubeUrlInfo {
  videoId: string;
  originalUrl: string;
  normalizedUrl: string;
  startTime?: number;
  thumbnailUrl: string;
  isValid: boolean;
}

/**
 * Analyse complète d'une URL YouTube
 */
export function analyzeYouTubeUrl(url: string): YouTubeUrlInfo | null {
  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    return null;
  }

  const startTime = extractYouTubeTimestamp(url);
  const normalizedUrl = normalizeYouTubeUrl(url);
  const thumbnailUrl = getYouTubeThumbnail(videoId, 'medium');

  return {
    videoId,
    originalUrl: url,
    normalizedUrl: normalizedUrl!,
    startTime: startTime || undefined,
    thumbnailUrl,
    isValid: true
  };
}
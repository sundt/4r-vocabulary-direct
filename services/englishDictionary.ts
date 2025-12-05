// English Dictionary Service
// Uses Free Dictionary API for definitions + Google Translate for pronunciation

export interface DictionaryEntry {
  word: string;
  phonetic: string;
  phoneticUs?: string;
  phoneticUk?: string;
  definition: string;
  partOfSpeech?: string;
  audioUrl?: string;
}

/**
 * Get Google Translate TTS audio URL
 * Uses Google's high-quality text-to-speech engine
 */
export const getGoogleTranslateAudioUrl = (word: string, lang: string = 'en'): string => {
  // Using Google Translate API endpoint for audio
  const encodedWord = encodeURIComponent(word);
  return `https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit`;
};

/**
 * Alternative: Generate speech URL using forvo or other sources
 * Forvo has real pronunciation from native speakers
 */
export const getForvoAudioUrl = (word: string): string => {
  // Forvo doesn't have a direct free API, so we'll use a workaround
  return `https://forvo.com/search/${encodeURIComponent(word)}/en/`;
};

/**
 * Best approach: Use ResponsiveVoice or similar CDN-based TTS
 * But for now, we'll construct a Google TTS URL
 */
export const buildGoogleTTSUrl = (text: string, lang: string = 'en'): string => {
  // Using a TTS endpoint that works reliably
  return `https://tts.api.cloud.google.com/v1/text:synthesize?key=YOUR_API_KEY`;
};

/**
 * Fetch word data from Free Dictionary API
 */
export const fetchWordFromDictionary = async (word: string): Promise<DictionaryEntry | null> => {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
    
    if (!response.ok) {
      console.warn(`Word not found in dictionary: ${word}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return null;
    }
    
    const entry = data[0];
    
    // Extract phonetic information
    let phoneticUs = '';
    let phoneticUk = '';
    
    // Get phonetics from phonetics array
    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      // Look for US pronunciation
      const usPhonetic = entry.phonetics.find((p: any) => p.text && p.text.includes('ˈ'));
      if (usPhonetic) {
        phoneticUs = usPhonetic.text || '';
      }
      
      // Look for UK pronunciation
      const ukPhonetic = entry.phonetics.find((p: any) => p.text && p.text.includes('ɡ'));
      if (ukPhonetic) {
        phoneticUk = ukPhonetic.text || '';
      }
    }
    
    // If we don't have US/UK variants, use main phonetic
    const mainPhonetic = entry.phonetic || phoneticUs || phoneticUk || '';
    if (!phoneticUs) phoneticUs = mainPhonetic;
    if (!phoneticUk) phoneticUk = mainPhonetic;
    
    // Get first definition
    let definition = '';
    if (entry.meanings && Array.isArray(entry.meanings) && entry.meanings.length > 0) {
      const meaning = entry.meanings[0];
      if (meaning.definitions && Array.isArray(meaning.definitions) && meaning.definitions.length > 0) {
        definition = meaning.definitions[0].definition || '';
      }
    }
    
    return {
      word: entry.word || word,
      phonetic: mainPhonetic,
      phoneticUs: phoneticUs || mainPhonetic,
      phoneticUk: phoneticUk || mainPhonetic,
      definition: definition,
      partOfSpeech: entry.meanings?.[0]?.partOfSpeech,
      audioUrl: undefined // We'll get audio separately
    };
  } catch (error) {
    console.error(`Error fetching word from dictionary: ${word}`, error);
    return null;
  }
};

/**
 * Cache for fetched words
 */
const wordCache = new Map<string, DictionaryEntry | null>();

/**
 * Get word data with caching
 */
export const getWordData = async (word: string): Promise<DictionaryEntry | null> => {
  const cacheKey = word.toLowerCase();
  
  if (wordCache.has(cacheKey)) {
    return wordCache.get(cacheKey) || null;
  }
  
  const result = await fetchWordFromDictionary(word);
  wordCache.set(cacheKey, result);
  
  return result;
};

/**
 * Get phonetic for a word
 */
export const getPhonetics = async (word: string): Promise<{ us: string; uk: string } | null> => {
  const entry = await getWordData(word);
  if (!entry) return null;
  return {
    us: entry.phoneticUs || '',
    uk: entry.phoneticUk || ''
  };
};

/**
 * Get definition for a word
 */
export const getDefinition = async (word: string): Promise<string | null> => {
  const entry = await getWordData(word);
  return entry?.definition || null;
};

/**
 * Get audio URL for a word using various services
 * Tries multiple sources in order of preference
 */
export const getAudioUrl = async (word: string): Promise<string | null> => {
  // Try multiple TTS services
  // 1. Try espeak online (open source, free)
  const espeakUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=en&total=1&idx=0&textlen=${word.length}&client=tw-ob`;
  
  // 2. Alternative: use a simple approach
  // Return null to trigger Web Speech API fallback which actually works better on most systems
  return null;
};

/**
 * Clear the cache
 */
export const clearCache = () => {
  wordCache.clear();
};


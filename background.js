// Background Service Worker: Handles API requests for word lookup
(function() {
  'use strict';

  // Configuration for translation API
  const API_CONFIG = {
    // Using a simple dictionary API as example
    // In production, you would use a proper translation API with authentication
    dictionaryAPI: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
  };

  // Cache for translations to reduce API calls
  const translationCache = new Map();

  // Handle messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'LOOKUP_WORD') {
      handleWordLookup(message.word, message.context)
        .then(result => sendResponse(result))
        .catch(error => {
          console.error('Word lookup failed:', error);
          sendResponse({ 
            success: false, 
            error: error.message 
          });
        });
      return true; // Keep the message channel open for async response
    }
  });

  // Lookup word using API
  async function handleWordLookup(word, context) {
    if (!word) {
      return { success: false, error: 'No word provided' };
    }

    // Check cache first
    const cacheKey = word.toLowerCase();
    if (translationCache.has(cacheKey)) {
      return {
        success: true,
        translation: translationCache.get(cacheKey),
        fromCache: true
      };
    }

    try {
      // Call dictionary API
      const result = await fetchDictionaryAPI(word);
      
      if (result.success) {
        // Cache the result
        translationCache.set(cacheKey, result.translation);
        
        // Limit cache size
        if (translationCache.size > 100) {
          const firstKey = translationCache.keys().next().value;
          translationCache.delete(firstKey);
        }
      }

      return result;
    } catch (error) {
      console.error('API error:', error);
      return {
        success: false,
        error: 'Failed to fetch translation'
      };
    }
  }

  // Fetch from dictionary API
  async function fetchDictionaryAPI(word) {
    try {
      const response = await fetch(`${API_CONFIG.dictionaryAPI}${encodeURIComponent(word)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            translation: formatNoDefinitionFound(word)
          };
        }
        throw new Error(`API returned status ${response.status}`);
      }

      const data = await response.json();
      const translation = formatDictionaryResponse(data);
      
      return {
        success: true,
        translation: translation
      };
    } catch (error) {
      console.error('Dictionary API error:', error);
      // Fallback to a simple message
      return {
        success: true,
        translation: formatFallbackTranslation(word)
      };
    }
  }

  // Format dictionary API response
  function formatDictionaryResponse(data) {
    if (!data || data.length === 0) {
      return '<p>No definition found.</p>';
    }

    const entry = data[0];
    let html = '';

    // Word and phonetics
    if (entry.phonetic) {
      html += `<div style="margin-bottom: 8px;"><strong>Pronunciation:</strong> ${escapeHtml(entry.phonetic)}</div>`;
    }

    // Meanings
    if (entry.meanings && entry.meanings.length > 0) {
      entry.meanings.forEach((meaning, index) => {
        if (index < 2) { // Limit to first 2 meanings
          html += `<div style="margin-bottom: 8px;">`;
          html += `<strong>${escapeHtml(meaning.partOfSpeech)}:</strong><br/>`;
          
          if (meaning.definitions && meaning.definitions.length > 0) {
            meaning.definitions.forEach((def, defIndex) => {
              if (defIndex < 2) { // Limit to first 2 definitions per meaning
                html += `${defIndex + 1}. ${escapeHtml(def.definition)}`;
                if (def.example) {
                  html += `<br/><em style="color: #666; font-size: 12px;">Example: ${escapeHtml(def.example)}</em>`;
                }
                html += '<br/>';
              }
            });
          }
          html += `</div>`;
        }
      });
    }

    return html || '<p>No definition available.</p>';
  }

  // Format message when no definition is found
  function formatNoDefinitionFound(word) {
    return `<p>No definition found for "<strong>${escapeHtml(word)}</strong>".</p>
            <p style="font-size: 12px; color: #666;">The word might be spelled incorrectly or not in the dictionary.</p>`;
  }

  // Format fallback translation
  function formatFallbackTranslation(word) {
    return `<p>Unable to fetch definition for "<strong>${escapeHtml(word)}</strong>" at this time.</p>
            <p style="font-size: 12px; color: #666;">Please check your internet connection and try again.</p>`;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Listen for extension installation
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      console.log('4R Vocabulary Direct extension installed');
      // Set default settings
      chrome.storage.local.set({
        enabled: true,
        apiProvider: 'dictionary'
      });
    } else if (details.reason === 'update') {
      console.log('4R Vocabulary Direct extension updated');
    }
  });

  console.log('4R Vocabulary Direct background service worker loaded');

})();

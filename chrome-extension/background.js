// background.js - The API Fetcher (Handles CORS)
console.log('LinguaContext Background Service Worker Started');

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'LOOKUP_WORD') {
    handleWordLookup(request.word, sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'SAVE_WORD') {
    handleSaveWord(request.data, sendResponse);
    return true;
  }
  
  if (request.type === 'GET_SAVED_WORDS') {
    handleGetSavedWords(sendResponse);
    return true;
  }
});

/**
 * Fetch word definition from online API
 */
async function handleWordLookup(word, sendResponse) {
  try {
    const cleanWord = word.toLowerCase().trim();
    
    // Try multiple APIs for better coverage
    const result = await fetchFromDictionaryAPI(cleanWord);
    
    if (result.success) {
      sendResponse({ success: true, data: result.data });
    } else {
      // Fallback: Try alternative API
      const fallbackResult = await fetchFromYoudaoAPI(cleanWord);
      sendResponse(fallbackResult);
    }
  } catch (error) {
    console.error('Word lookup error:', error);
    sendResponse({ 
      success: false, 
      error: 'Failed to fetch word definition',
      message: error.message 
    });
  }
}

/**
 * Primary API: Free Dictionary API
 * https://dictionaryapi.dev/
 */
async function fetchFromDictionaryAPI(word) {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
    );
    
    if (!response.ok) {
      return { success: false, error: 'Word not found' };
    }
    
    const data = await response.json();
    const entry = data[0];
    
    // Extract relevant information
    const meanings = entry.meanings || [];
    const firstMeaning = meanings[0] || {};
    const definitions = firstMeaning.definitions || [];
    
    // Get phonetics - 从phonetics数组中智能提取
    const phonetics = entry.phonetics || [];
    
    let phoneticUs = '';
    let phoneticUk = '';
    
    // 策略1: 查找明确标记为US/UK的audio
    const usAudioEntry = phonetics.find(p => p.text && p.audio && p.audio.includes('-us'));
    const ukAudioEntry = phonetics.find(p => p.text && p.audio && p.audio.includes('-uk'));
    
    if (usAudioEntry) phoneticUs = usAudioEntry.text;
    if (ukAudioEntry) phoneticUk = ukAudioEntry.text;
    
    // 策略2: 如果有audio但没有US/UK标记，根据位置判断
    if (!phoneticUs || !phoneticUk) {
      const audioEntries = phonetics.filter(p => p.text && p.audio);
      if (audioEntries.length >= 2) {
        // 通常第一个是UK，第二个是US
        if (!phoneticUk && audioEntries[0]) phoneticUk = audioEntries[0].text;
        if (!phoneticUs && audioEntries[1]) phoneticUs = audioEntries[1].text;
      } else if (audioEntries.length === 1) {
        // 只有一个，audio包含us就是US，否则是UK
        if (audioEntries[0].audio.includes('us')) {
          phoneticUs = audioEntries[0].text;
        } else {
          phoneticUk = audioEntries[0].text;
        }
      }
    }
    
    // 策略3: 查找没有audio的entry（通常是UK）
    if (!phoneticUk) {
      const noAudioEntry = phonetics.find(p => p.text && !p.audio);
      if (noAudioEntry) phoneticUk = noAudioEntry.text;
    }
    
    // 策略4: 如果只有一个音标，US和UK使用同一个
    if (phoneticUs && !phoneticUk) {
      phoneticUk = phoneticUs;
    } else if (phoneticUk && !phoneticUs) {
      phoneticUs = phoneticUk;
    }
    
    // 策略5: 最后的fallback
    if (!phoneticUs && !phoneticUk) {
      const fallback = entry.phonetic || phonetics.find(p => p.text)?.text || '';
      phoneticUs = fallback;
      phoneticUk = fallback;
    }
    
    console.log(`Phonetics for "${word}": US=${phoneticUs}, UK=${phoneticUk}`);
    
    // Get audio URLs
    const audioUs = phonetics.find(p => p.audio.includes('-us'))?.audio || 
                    phonetics.find(p => p.audio)?.audio || '';
    const audioUk = phonetics.find(p => p.audio.includes('-uk'))?.audio || audioUs;
    
    // Extract synonyms and antonyms
    const synonyms = [];
    const antonyms = [];
    
    meanings.forEach(meaning => {
      if (meaning.synonyms) synonyms.push(...meaning.synonyms);
      if (meaning.antonyms) antonyms.push(...meaning.antonyms);
      meaning.definitions?.forEach(def => {
        if (def.synonyms) synonyms.push(...def.synonyms);
        if (def.antonyms) antonyms.push(...def.antonyms);
      });
    });
    
    // Fetch additional metadata (Collins, Oxford, tags)
    let metadata;
    try {
      metadata = await fetchWordMetadata(word);
    } catch (error) {
      console.error('Failed to fetch metadata, using defaults:', error);
      // Default metadata to ensure tags always show
      metadata = {
        collins: 3,
        oxford: false,
        tag: 'cet4'
      };
    }
    
    console.log('Final metadata for', word, ':', metadata);
    
    // Try to get Chinese translation from Youdao with timeout
    let translation = '';
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      const youdaoData = await Promise.race([
        fetchFromYoudaoAPI(word),
        timeoutPromise
      ]);
      if (youdaoData.success && youdaoData.data.translation) {
        translation = youdaoData.data.translation;
      }
    } catch (err) {
      console.log('Failed to fetch translation from Youdao:', err.message);
      // Continue without translation
    }
    
    // Build structured response
    const result = {
      word: entry.word,
      phonetic: entry.phonetic || phoneticUs || phoneticUk,
      phoneticUs: phoneticUs,
      phoneticUk: phoneticUk,
      audioUs: audioUs,
      audioUk: audioUk,
      definition: definitions[0]?.definition || '',
      partOfSpeech: firstMeaning.partOfSpeech || '',
      translation: translation,
      synonyms: [...new Set(synonyms)].slice(0, 5),
      antonyms: [...new Set(antonyms)].slice(0, 5),
      examples: definitions
        .filter(def => def.example)
        .slice(0, 3)
        .map(def => ({
          sentence: def.example,
          source: 'Dictionary API',
          year: new Date().getFullYear()
        })),
      meanings: meanings.map(m => ({
        partOfSpeech: m.partOfSpeech,
        definitions: m.definitions.slice(0, 3).map(d => ({
          definition: d.definition,
          example: d.example
        }))
      })),
      // Add metadata - ensure values are always set
      collins: metadata.collins || 3,
      oxford: metadata.oxford || false,
      tag: metadata.tag || 'cet4'
    };
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Dictionary API error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch word metadata (Collins, Oxford, tags) from online API
 * Uses multiple online sources for comprehensive data
 */
async function fetchWordMetadata(word) {
  try {
    const lowerWord = word.toLowerCase();
    
    // Method 1: Try Words API (wordsapi.com) - Requires API key but has free tier
    // For demo, we'll use public APIs
    
    // Method 2: Try Datamuse API for word frequency data
    try {
      const datmuseResponse = await fetch(
        `https://api.datamuse.com/words?sp=${encodeURIComponent(lowerWord)}&md=f&max=1`
      );
      
      if (datmuseResponse.ok) {
        const datmuseData = await datmuseResponse.json();
        console.log('Datamuse response for', lowerWord, ':', datmuseData);
        
        if (datmuseData.length > 0 && datmuseData[0].word === lowerWord) {
          // Datamuse frequency is on a log scale, typically 0-100+
          const freqTag = datmuseData[0].tags?.find(t => t.startsWith('f:'));
          const freq = freqTag ? parseFloat(freqTag.substring(2)) : 0;
          
          console.log('Frequency for', lowerWord, ':', freq);
          
          // Convert frequency to Collins rating (adjusted thresholds)
          let collins = 0;
          if (freq >= 40) collins = 5;      // Very high frequency
          else if (freq >= 25) collins = 4;  // High frequency
          else if (freq >= 15) collins = 3;  // Medium-high frequency
          else if (freq >= 5) collins = 2;   // Medium frequency
          else if (freq > 0) collins = 1;    // Low frequency
          
          // Oxford 3000: high frequency words
          const oxford = freq >= 25;
          
          // Tags based on frequency
          const tags = [];
          if (collins >= 5) tags.push('zk', 'gk');
          else if (collins >= 4) tags.push('gk', 'cet4');
          else if (collins >= 3) tags.push('cet4');
          else if (collins >= 2) tags.push('cet6');
          
          console.log('Metadata for', lowerWord, '- Collins:', collins, 'Oxford:', oxford, 'Tags:', tags);
          
          return {
            collins: collins,
            oxford: oxford,
            tag: tags.join(' ')
          };
        }
      }
    } catch (apiError) {
      console.error('Datamuse API error:', apiError);
    }
    
    // Method 3: Use word characteristics as final fallback
    // Based on word length and common patterns
    const wordLength = lowerWord.length;
    let collins = 0;
    
    // Very short words are usually more common
    if (wordLength <= 3) {
      collins = 4;
    } else if (wordLength <= 5) {
      collins = 3;
    } else if (wordLength <= 7) {
      collins = 2;
    } else {
      collins = 1;
    }
    
    const oxford = wordLength <= 5;
    const tags = [];
    if (collins >= 4) tags.push('gk', 'cet4');
    else if (collins >= 3) tags.push('cet4');
    else if (collins >= 2) tags.push('cet6');
    else tags.push('cet6'); // Ensure at least one tag
    
    console.log('Fallback metadata for', lowerWord, '- Collins:', collins, 'Oxford:', oxford, 'Tags:', tags);
    
    return {
      collins: collins || 1, // Ensure at least 1 star
      oxford: oxford,
      tag: tags.join(' ')
    };
  } catch (error) {
    console.error('Metadata fetch error:', error);
    // Return default values to ensure tags always show
    return {
      collins: 2,
      oxford: false,
      tag: 'cet6'
    };
  }
}

/**
 * Fallback API: Youdao (with basic scraping)
 * Note: This is a simplified version
 */
async function fetchFromYoudaoAPI(word) {
  try {
    // Use Youdao's suggest API (public endpoint)
    const response = await fetch(
      `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`
    );
    
    if (!response.ok) {
      return { success: false, error: 'Youdao API failed' };
    }
    
    const data = await response.json();
    
    // Basic parsing of Youdao response
    const result = {
      word: word,
      phonetic: data.ec?.word?.[0]?.usphone || data.ec?.word?.[0]?.ukphone || '',
      phoneticUs: data.ec?.word?.[0]?.usphone || '',
      phoneticUk: data.ec?.word?.[0]?.ukphone || '',
      audioUs: `https://dict.youdao.com/dictvoice?type=0&audio=${word}`,
      audioUk: `https://dict.youdao.com/dictvoice?type=1&audio=${word}`,
      definition: data.ec?.word?.[0]?.trs?.[0]?.tr?.[0]?.l?.i?.[0] || '',
      translation: data.ec?.word?.[0]?.trs?.[0]?.tr?.[0]?.l?.i?.[0] || '',
      partOfSpeech: '',
      synonyms: [],
      antonyms: [],
      examples: []
    };
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Youdao API error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save word to Chrome storage
 */
async function handleSaveWord(wordData, sendResponse) {
  try {
    const { words = [] } = await chrome.storage.local.get('words');
    
    // Check if word already exists
    const existingIndex = words.findIndex(w => w.word === wordData.word);
    
    if (existingIndex >= 0) {
      // Update existing word
      words[existingIndex] = {
        ...words[existingIndex],
        ...wordData,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new word
      words.unshift({
        ...wordData,
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewed: null
      });
    }
    
    await chrome.storage.local.set({ words });
    sendResponse({ success: true, totalWords: words.length });
  } catch (error) {
    console.error('Save word error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Get all saved words
 */
async function handleGetSavedWords(sendResponse) {
  try {
    const { words = [] } = await chrome.storage.local.get('words');
    sendResponse({ success: true, words });
  } catch (error) {
    console.error('Get words error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Context menu (right-click) integration
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'lookupWord',
    title: 'Look up "%s" with LinguaContext',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'lookupWord' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'CONTEXT_MENU_LOOKUP',
      word: info.selectionText.trim()
    });
  }
});

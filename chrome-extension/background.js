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
 * Fetch word definition from Youdao API only
 */
async function handleWordLookup(word, sendResponse) {
  try {
    const cleanWord = word.toLowerCase().trim();
    
    // Use Youdao API as the primary and only source
    const result = await fetchFromYoudaoAPI(cleanWord);
    
    if (result.success) {
      sendResponse({ success: true, data: result.data });
    } else {
      sendResponse({ success: false, error: result.error || 'Word not found' });
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
 * Detect base form of a word using pattern matching
 */
function detectBaseForm(word) {
  const originalWord = word.toLowerCase();
  let baseForm = '';
  let baseFormType = '';
  
  // Common derivation patterns (ordered by specificity)
  const patterns = [
    // -tion/-sion endings (nouns from verbs)
    { test: /(.+)ision$/, replace: '$1ide', type: 'verb' },      // decision → decide
    { test: /(.+)ation$/, replace: '$1ate', type: 'verb' },      // creation → create
    { test: /(.+)ution$/, replace: '$1ute', type: 'verb' },      // solution → solve
    { test: /(.+[^s])tion$/, replace: '$1t', type: 'verb' },     // action → act
    { test: /(.+)sion$/, replace: '$1de', type: 'verb' },        // revision → revise
    
    // -ment endings (nouns from verbs)
    { test: /(.+)ment$/, replace: '$1', type: 'verb' },          // development → develop
    
    // -ance/-ence endings (nouns from verbs)
    { test: /(.+)ance$/, replace: '$1', type: 'verb' },          // performance → perform
    { test: /(.+)ence$/, replace: '$1', type: 'verb' },          // existence → exist
    
    // -ness endings (nouns from adjectives)
    { test: /(.+)ness$/, replace: '$1', type: 'adjective' },     // kindness → kind
    
    // -ity/-ty endings (nouns from adjectives)
    { test: /(.+)ability$/, replace: '$1able', type: 'adjective' }, // capability → capable
    { test: /(.+)ibility$/, replace: '$1ible', type: 'adjective' },  // possibility → possible
    { test: /(.+[^i])ty$/, replace: '$1', type: 'adjective' },   // certainty → certain
    
    // -ly endings (adverbs from adjectives)
    { test: /(.+)ily$/, replace: '$1y', type: 'adjective' },     // happily → happy
    { test: /(.+)ly$/, replace: '$1', type: 'adjective' },       // quickly → quick
    
    // Verb forms
    { test: /(.+[^aeiou])ied$/, replace: '$1y', type: 'verb' },  // tried → try
    { test: /(.+)ing$/, replace: '$1', type: 'verb' },           // running → run
    { test: /(.+)ed$/, replace: '$1', type: 'verb' },            // played → play
  ];
  
  for (const pattern of patterns) {
    const match = originalWord.match(pattern.test);
    if (match && originalWord.length > 4) {
      baseForm = originalWord.replace(pattern.test, pattern.replace);
      
      // Handle double consonants (running → run, stopped → stop)
      if (baseForm.length >= 3) {
        const lastTwo = baseForm.slice(-2);
        if (lastTwo[0] === lastTwo[1] && !'aeiou'.includes(lastTwo[0])) {
          baseForm = baseForm.slice(0, -1);
        }
      }
      
      // Special cases
      if (originalWord === 'solution') baseForm = 'solve';
      
      baseFormType = pattern.type;
      
      // Only use if baseForm is different from original
      if (baseForm === originalWord) {
        baseForm = '';
        baseFormType = '';
      }
      
      if (baseForm) break;
    }
  }
  
  return { baseForm, baseFormType };
}

/**
 * Primary API: Youdao Dictionary API
 * Fetches all data from Youdao only
 */
async function fetchFromYoudaoAPI(word) {
  try {
    // Use Youdao's API (public endpoint)
    const response = await fetch(
      `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`
    );
    
    if (!response.ok) {
      return { success: false, error: 'Youdao API failed' };
    }
    
    const data = await response.json();
    
    // Extract all English definitions with synonyms from ee (English-English) field (WordNet source)
    let englishDefinitions = [];
    if (data.ee?.word?.trs?.[0]?.tr) {
      englishDefinitions = data.ee.word.trs[0].tr
        .map(item => {
          const definition = item.l?.i;
          const synonyms = item['similar-words']?.map(sw => sw.similar).filter(s => s) || [];
          return {
            definition: definition,
            synonyms: synonyms
          };
        })
        .filter(item => item.definition && item.definition.trim() !== '');
    }
    
    // Extract authoritative examples (auth_sents_part) - 权威例句
    let authExamples = [];
    if (data.auth_sents_part?.sent) {
      authExamples = data.auth_sents_part.sent.slice(0, 3).map(item => ({
        sentence: item.foreign?.replace(/<\/?b>/g, '') || '',
        source: item.source?.replace(/<\/?i>/g, '') || 'Authoritative',
        type: 'auth'
      }));
    }
    
    // Extract media examples (media_sents_part) - 原声例句
    let mediaExamples = [];
    if (data.media_sents_part?.sent) {
      mediaExamples = data.media_sents_part.sent.slice(0, 3).map(item => ({
        sentence: item.eng?.replace(/<\/?b>/g, '').replace(/<br>/g, '') || '',
        source: item.snippets?.snippet?.[0]?.source || 'Media',
        type: 'media'
      }));
    }
    
    // Combine examples: first auth, then media
    const youdaoExamples = [...authExamples, ...mediaExamples];
    
    // Extract exam type tags
    const examTags = data.ec?.exam_type || [];
    
    // Extract synonyms from syno field
    let synonyms = [];
    if (data.syno?.synos && data.syno.synos.length > 0) {
      synonyms = data.syno.synos[0].syno?.ws?.map(item => item.w).filter(w => w) || [];
    }
    
    // Detect base form
    const { baseForm, baseFormType } = detectBaseForm(word);
    
    // Get translation for base form if it exists
    let baseFormTranslation = '';
    if (baseForm) {
      try {
        const baseResponse = await fetch(
          `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(baseForm)}`
        );
        if (baseResponse.ok) {
          const baseData = await baseResponse.json();
          baseFormTranslation = baseData.ec?.word?.[0]?.trs?.[0]?.tr?.[0]?.l?.i?.[0] || '';
        }
      } catch (err) {
        console.log('Failed to fetch base form translation:', err.message);
      }
    }
    
    // Build complete response
    const result = {
      word: word,
      phonetic: data.ec?.word?.[0]?.usphone || data.ec?.word?.[0]?.ukphone || '',
      phoneticUs: data.ec?.word?.[0]?.usphone || '',
      phoneticUk: data.ec?.word?.[0]?.ukphone || '',
      audioUs: `https://dict.youdao.com/dictvoice?type=0&audio=${word}`,
      audioUk: `https://dict.youdao.com/dictvoice?type=1&audio=${word}`,
      definition: englishDefinitions.length > 0 ? englishDefinitions[0].definition : (data.ec?.word?.[0]?.trs?.[0]?.tr?.[0]?.l?.i?.[0] || ''),
      allDefinitions: englishDefinitions,
      translation: data.ec?.word?.[0]?.trs?.[0]?.tr?.[0]?.l?.i?.[0] || '',
      partOfSpeech: '',
      synonyms: synonyms,
      antonyms: [],
      examples: youdaoExamples,
      youdaoTags: examTags,
      baseForm: baseForm,
      baseFormType: baseFormType,
      baseFormTranslation: baseFormTranslation
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

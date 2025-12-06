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
 * 反向查找原形词：通过查询可能的原形词，检查其wfs是否包含当前词
 * 这样可以利用有道API的权威数据，避免维护本地映射表
 */
async function findBaseFormFromYoudao(word, currentData) {
  const originalWord = word.toLowerCase();
  
  // 生成可能的原形词候选
  const candidates = generateBaseCandidates(originalWord);
  
  // 遍历候选词，查询有道API
  for (const candidate of candidates) {
    try {
      const response = await fetch(
        `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(candidate.base)}`
      );
      
      if (!response.ok) continue;
      
      const baseData = await response.json();
      const wfs = baseData.ec?.word?.[0]?.wfs || [];
      
      // 检查wfs中是否包含当前查询的词
      const matchingWf = wfs.find(item => 
        item.wf?.value?.toLowerCase() === originalWord
      );
      
      if (matchingWf) {
        // 找到了！提取原形词的翻译
        let baseFormTranslation = '';
        const baseTrs = baseData.ec?.word?.[0]?.trs || [];
        for (const tr of baseTrs) {
          const text = tr?.tr?.[0]?.l?.i?.[0] || '';
          if (text && !text.match(/^[a-z]+[\.\u3002．]\s*$/i)) {
            baseFormTranslation = text;
            break;
          }
        }
        
        // 提取所有词形变化
        const wordForms = wfs.map(item => ({
          name: item.wf?.name || '',
          value: item.wf?.value || ''
        })).filter(item => item.name && item.value);
        
        return {
          baseForm: candidate.base,
          baseFormType: matchingWf.wf?.name || candidate.type,
          baseFormTranslation,
          wordForms
        };
      }
    } catch (err) {
      console.log(`Failed to check candidate ${candidate.base}:`, err.message);
    }
  }
  
  return null;
}

/**
 * 生成可能的原形词候选
 * 使用简单规则生成候选，实际验证由有道API完成
 */
function generateBaseCandidates(word) {
  const candidates = [];
  
  // 不规则形式的直接映射（只保留最常见的）
  const irregulars = {
    'better': 'good',
    'best': 'good',
    'worse': 'bad',
    'worst': 'bad',
    'children': 'child',
    'people': 'person',
    'men': 'man',
    'women': 'woman'
  };
  
  if (irregulars[word]) {
    candidates.push({ base: irregulars[word], type: 'irregular' });
  }
  
  // 规则变形：生成多个可能的原形
  if (word.endsWith('ies')) {
    candidates.push({ base: word.slice(0, -3) + 'y', type: 'plural/verb' });
  }
  if (word.endsWith('es') && word.length > 3) {
    candidates.push({ base: word.slice(0, -2), type: 'plural/verb' });
    candidates.push({ base: word.slice(0, -1), type: 'plural/verb' });
  }
  if (word.endsWith('s') && word.length > 3) {
    candidates.push({ base: word.slice(0, -1), type: 'plural/verb' });
  }
  if (word.endsWith('ed') && word.length > 3) {
    candidates.push({ base: word.slice(0, -2), type: 'past' });
    candidates.push({ base: word.slice(0, -1), type: 'past' });
    if (word.length > 4) {
      candidates.push({ base: word.slice(0, -3), type: 'past' });
    }
  }
  if (word.endsWith('ing') && word.length > 4) {
    candidates.push({ base: word.slice(0, -3), type: 'gerund' });
    candidates.push({ base: word.slice(0, -3) + 'e', type: 'gerund' });
    if (word.length > 5) {
      candidates.push({ base: word.slice(0, -4), type: 'gerund' });
    }
  }
  if (word.endsWith('er') && word.length > 3) {
    candidates.push({ base: word.slice(0, -2), type: 'comparative' });
    // 双写辅音: bigger → big
    if (word.length > 4) {
      candidates.push({ base: word.slice(0, -3), type: 'comparative' });
    }
  }
  if (word.endsWith('est') && word.length > 4) {
    // 普通形式: fastest → fast, latest → late
    candidates.push({ base: word.slice(0, -3), type: 'superlative' });
    // 添加 -e 形式: latest → late (去掉 st，保留 e)
    candidates.push({ base: word.slice(0, -2), type: 'superlative' });
    // 双写辅音: biggest → big
    if (word.length > 5) {
      candidates.push({ base: word.slice(0, -4), type: 'superlative' });
    }
  }
  if (word.endsWith('ier')) {
    candidates.push({ base: word.slice(0, -3) + 'y', type: 'comparative' });
  }
  if (word.endsWith('iest')) {
    candidates.push({ base: word.slice(0, -4) + 'y', type: 'superlative' });
  }
  
  return candidates;
}

/**
 * Detect base form of a word using pattern matching (DEPRECATED - 保留作为后备)
 */
function detectBaseForm(word) {
  const originalWord = word.toLowerCase();
  let baseForm = '';
  let baseFormType = '';
  
  // 不规则比较级/最高级
  const irregularComparatives = {
    'better': { base: 'good', type: 'adjective' },
    'best': { base: 'good', type: 'adjective' },
    'worse': { base: 'bad', type: 'adjective' },
    'worst': { base: 'bad', type: 'adjective' },
    'more': { base: 'many', type: 'adjective' },
    'most': { base: 'many', type: 'adjective' },
    'less': { base: 'little', type: 'adjective' },
    'least': { base: 'little', type: 'adjective' },
    'further': { base: 'far', type: 'adjective' },
    'furthest': { base: 'far', type: 'adjective' },
    'farther': { base: 'far', type: 'adjective' },
    'farthest': { base: 'far', type: 'adjective' }
  };
  
  // 检查不规则形式
  if (irregularComparatives[originalWord]) {
    return irregularComparatives[originalWord];
  }
  
  // 常见不规则复数
  const irregularPlurals = {
    'children': { base: 'child', type: 'noun' },
    'people': { base: 'person', type: 'noun' },
    'men': { base: 'man', type: 'noun' },
    'women': { base: 'woman', type: 'noun' },
    'teeth': { base: 'tooth', type: 'noun' },
    'feet': { base: 'foot', type: 'noun' },
    'mice': { base: 'mouse', type: 'noun' },
    'geese': { base: 'goose', type: 'noun' }
  };
  
  if (irregularPlurals[originalWord]) {
    return irregularPlurals[originalWord];
  }
  
  // Common derivation patterns (ordered by specificity)
  const patterns = [
    // 复数形式
    { test: /(.+)ies$/, replace: '$1y', type: 'noun' },          // cities → city
    { test: /(.+[sxz])es$/, replace: '$1', type: 'noun' },       // boxes → box
    { test: /(.+[^aeiou])ves$/, replace: '$1fe', type: 'noun' }, // knives → knife
    { test: /(.+)ves$/, replace: '$1f', type: 'noun' },          // leaves → leaf
    { test: /(.+)s$/, replace: '$1', type: 'noun', minLen: 4 },  // cats → cat, establishments → establishment
    
    // 比较级/最高级
    { test: /(.+[^aeiou])ier$/, replace: '$1y', type: 'adjective' },  // happier → happy
    { test: /(.+[^aeiou])iest$/, replace: '$1y', type: 'adjective' }, // happiest → happy
    { test: /(.+)er$/, replace: '$1', type: 'adjective', minLen: 5 }, // bigger → big
    { test: /(.+)est$/, replace: '$1', type: 'adjective', minLen: 5 }, // biggest → big
    
    // 动词形式
    { test: /(.+[^aeiou])ies$/, replace: '$1y', type: 'verb' },  // tries → try
    { test: /(.+)ying$/, replace: '$1y', type: 'verb' },         // trying → try
    { test: /(.+)ied$/, replace: '$1y', type: 'verb' },          // tried → try
    { test: /(.+[aeiou])ing$/, replace: '$1e', type: 'verb' },   // coming → come
    { test: /(.+)ing$/, replace: '$1', type: 'verb' },           // running → run, suing → sue
    { test: /(.+)ed$/, replace: '$1', type: 'verb' },            // played → play, sued → sue
    
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
  ];
  
  for (const pattern of patterns) {
    const match = originalWord.match(pattern.test);
    const minLen = pattern.minLen || 4;
    
    if (match && originalWord.length >= minLen) {
      baseForm = originalWord.replace(pattern.test, pattern.replace);
      
      // Handle double consonants (running → run, stopped → stop, bigger → big)
      if (baseForm.length >= 3) {
        const lastTwo = baseForm.slice(-2);
        if (lastTwo[0] === lastTwo[1] && !'aeiou'.includes(lastTwo[0])) {
          baseForm = baseForm.slice(0, -1);
        }
      }
      
      // Special cases
      if (originalWord === 'solution') baseForm = 'solve';
      if (originalWord === 'sues') baseForm = 'sue';
      if (originalWord === 'sued') baseForm = 'sue';
      if (originalWord === 'suing') baseForm = 'sue';
      
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
      authExamples = data.auth_sents_part.sent.slice(0, 2).map(item => ({
        sentence: item.foreign?.replace(/<\/?b>/g, '') || '',
        source: item.source?.replace(/<\/?i>/g, '') || 'Authoritative',
        type: 'auth'
      }));
    }
    
    // Extract media examples (media_sents_part) - 原声例句
    let mediaExamples = [];
    if (data.media_sents_part?.sent) {
      mediaExamples = data.media_sents_part.sent.slice(0, 2).map(item => ({
        sentence: item.eng?.replace(/<\/?b>/g, '').replace(/<br>/g, '') || '',
        source: item.snippets?.snippet?.[0]?.source || 'Media',
        type: 'media'
      }));
    }
    
    // Combine examples: first auth, then media (limit to 2 total)
    const youdaoExamples = [...authExamples, ...mediaExamples].slice(0, 2);
    
    // Extract exam type tags
    const examTags = data.ec?.exam_type || [];
    
    // Extract synonyms from syno field
    let synonyms = [];
    if (data.syno?.synos && data.syno.synos.length > 0) {
      synonyms = data.syno.synos[0].syno?.ws?.map(item => item.w).filter(w => w) || [];
    }
    
    // 首先检查当前词是否有词形变化数据（说明它是原形词）
    const currentWfs = data.ec?.word?.[0]?.wfs || [];
    let baseForm = '';
    let baseFormType = '';
    let baseFormTranslation = '';
    let wordForms = [];
    
    if (currentWfs.length > 0) {
      // 当前词就是原形词，直接使用其词形变化数据
      wordForms = currentWfs.map(item => ({
        name: item.wf?.name || '',
        value: item.wf?.value || ''
      })).filter(item => item.name && item.value);
    } else {
      // 当前词可能是变形，尝试反向查找原形词
      const detectedBase = await findBaseFormFromYoudao(word, data);
      if (detectedBase) {
        baseForm = detectedBase.baseForm;
        baseFormType = detectedBase.baseFormType;
        baseFormTranslation = detectedBase.baseFormTranslation;
        wordForms = detectedBase.wordForms;
      }
    }
    
    // 获取中文翻译 - 收集词性和翻译
    let translation = '';
    let partOfSpeech = '';
    const trs = data.ec?.word?.[0]?.trs || [];
    
    for (const tr of trs) {
      const text = tr?.tr?.[0]?.l?.i?.[0] || '';
      if (!text) continue;
      
      // 检查是否为纯词性标记
      if (text.match(/^[a-z]+[\.\u3002．]\s*$/i)) {
        // 保存词性,继续查找翻译
        if (!partOfSpeech) {
          partOfSpeech = text.trim();
        }
      } else {
        // 找到翻译
        translation = text;
        break;
      }
    }
    
    // 组合词性和翻译
    let finalTranslation = '';
    if (partOfSpeech && translation) {
      finalTranslation = `${partOfSpeech} ${translation}`;
    } else if (translation) {
      finalTranslation = translation;
    } else if (partOfSpeech) {
      finalTranslation = partOfSpeech;
    }
    
    // Build complete response
    const result = {
      word: word,
      phonetic: data.ec?.word?.[0]?.usphone || data.ec?.word?.[0]?.ukphone || '',
      phoneticUs: data.ec?.word?.[0]?.usphone || '',
      phoneticUk: data.ec?.word?.[0]?.ukphone || '',
      audioUs: `https://dict.youdao.com/dictvoice?type=0&audio=${word}`,
      audioUk: `https://dict.youdao.com/dictvoice?type=1&audio=${word}`,
      definition: englishDefinitions.length > 0 ? englishDefinitions[0].definition : (finalTranslation || ''),
      allDefinitions: englishDefinitions,
      translation: finalTranslation,
      partOfSpeech: partOfSpeech,
      synonyms: synonyms,
      antonyms: [],
      examples: youdaoExamples,
      youdaoTags: examTags,
      baseForm: baseForm,
      baseFormType: baseFormType,
      baseFormTranslation: baseFormTranslation,
      wordForms: wordForms
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

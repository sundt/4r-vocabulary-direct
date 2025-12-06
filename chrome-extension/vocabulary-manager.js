/**
 * Vocabulary Manager - 生词本管理模块
 * 使用 Chrome Storage Local 存储(无配额限制)
 */

// 配置
const VOCABULARY_KEY = 'vocabulary';
const STORAGE = chrome.storage.local; // 改用 local storage,避免 sync 的配额限制

/**
 * 保存单词到生词本
 */
function saveWord(wordData) {
  if (!chrome || !chrome.storage) {
    return Promise.resolve({ success: false, error: 'Chrome Storage API 不可用' });
  }
  
  return new Promise((resolve) => {
    STORAGE.get(VOCABULARY_KEY, (storageData) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      
      const vocabulary = storageData[VOCABULARY_KEY] || [];
      const existingIndex = vocabulary.findIndex(w => w.word === wordData.word);
    
      if (existingIndex >= 0) {
        // 更新现有单词
        vocabulary[existingIndex] = {
          ...vocabulary[existingIndex],
          word: wordData.word,
          phonetic: wordData.phonetic || vocabulary[existingIndex].phonetic,
          translation: wordData.translation || vocabulary[existingIndex].translation,
          definition: wordData.definition || vocabulary[existingIndex].definition,
          tags: wordData.tags || vocabulary[existingIndex].tags,
          reviewCount: (vocabulary[existingIndex].reviewCount || 0) + 1,
          lastReviewed: new Date().toISOString(),
          // 更新上下文信息（保留原有的，如果没有新的）
          contextSentence: wordData.contextSentence || vocabulary[existingIndex].contextSentence || '',
          sourceUrl: wordData.sourceUrl || vocabulary[existingIndex].sourceUrl || ''
        };
      } else {
        // 添加新单词 - 保存核心信息和上下文
        vocabulary.push({
          word: wordData.word,
          phonetic: wordData.phonetic || '',
          translation: wordData.translation || '',
          definition: wordData.definition || '',
          tags: wordData.tags || [],
          addedAt: new Date().toISOString(),
          reviewCount: 0,
          lastReviewed: null,
          // 新增：保存上下文句子和来源URL
          contextSentence: wordData.contextSentence || '',
          sourceUrl: wordData.sourceUrl || ''
        });
      }
      
      STORAGE.set({ [VOCABULARY_KEY]: vocabulary }, () => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        
        updateBadge(vocabulary.length);
        resolve({ success: true, isNew: existingIndex < 0 });
      });
    });
  });
}

/**
 * 从生词本删除单词
 */
async function removeWord(word) {
  try {
    const { vocabulary = [] } = await STORAGE.get(VOCABULARY_KEY);
    const updated = vocabulary.filter(w => w.word !== word);
    
    await STORAGE.set({ [VOCABULARY_KEY]: updated });
    
    // 更新徽章数字
    updateBadge(updated.length);
    
    return { success: true };
  } catch (error) {
    console.error('删除单词失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 检查单词是否已收藏
 */
async function isWordSaved(word) {
  try {
    const { vocabulary = [] } = await STORAGE.get(VOCABULARY_KEY);
    return vocabulary.some(w => w.word === word);
  } catch (error) {
    console.error('检查单词失败:', error);
    return false;
  }
}

/**
 * 获取所有生词
 */
async function getAllWords() {
  try {
    const { vocabulary = [] } = await STORAGE.get(VOCABULARY_KEY);
    return vocabulary;
  } catch (error) {
    console.error('获取生词本失败:', error);
    return [];
  }
}

/**
 * 获取单词详情
 */
async function getWord(word) {
  try {
    const { vocabulary = [] } = await STORAGE.get(VOCABULARY_KEY);
    return vocabulary.find(w => w.word === word);
  } catch (error) {
    console.error('获取单词详情失败:', error);
    return null;
  }
}

/**
 * 更新单词复习信息
 */
async function updateReviewInfo(word) {
  try {
    const { vocabulary = [] } = await STORAGE.get(VOCABULARY_KEY);
    const index = vocabulary.findIndex(w => w.word === word);
    
    if (index >= 0) {
      vocabulary[index].reviewCount = (vocabulary[index].reviewCount || 0) + 1;
      vocabulary[index].lastReviewed = new Date().toISOString();
      await STORAGE.set({ [VOCABULARY_KEY]: vocabulary });
    }
    
    return { success: true };
  } catch (error) {
    console.error('更新复习信息失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 导出为CSV格式
 */
function exportToCSV(vocabulary) {
  const headers = ['单词', '美式音标', '英式音标', '中文释义', '英文定义', '例句', '标签', '添加时间', '复习次数', '上下文句子', '来源网址'];
  
  const rows = vocabulary.map(w => [
    w.word,
    w.phoneticUs || w.phonetic,
    w.phoneticUk || w.phonetic,
    w.translation,
    w.definition,
    (w.examples || []).slice(0, 2).map(e => e.sentence).join(' | '),
    (w.tags || []).join(', '),
    new Date(w.addedAt).toLocaleString('zh-CN'),
    w.reviewCount || 0,
    w.contextSentence || '',
    w.sourceUrl || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  // 添加UTF-8 BOM以支持中文
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vocabulary_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 导出为JSON格式（完整备份）
 */
function exportToJSON(vocabulary) {
  const jsonContent = JSON.stringify(vocabulary, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vocabulary_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 从JSON导入生词本
 */
async function importFromJSON(jsonContent) {
  try {
    const imported = JSON.parse(jsonContent);
    
    if (!Array.isArray(imported)) {
      throw new Error('Invalid JSON format');
    }
    
    const { vocabulary = [] } = await STORAGE.get(VOCABULARY_KEY);
    
    // 合并导入的数据（避免重复）
    const merged = [...vocabulary];
    let addedCount = 0;
    
    for (const word of imported) {
      if (!merged.find(w => w.word === word.word)) {
        merged.push(word);
        addedCount++;
      }
    }
    
    await STORAGE.set({ [VOCABULARY_KEY]: merged });
    updateBadge(merged.length);
    
    return { success: true, addedCount, total: merged.length };
  } catch (error) {
    console.error('导入失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 更新扩展徽章显示生词数量
 */
function updateBadge(count) {
  if (typeof chrome !== 'undefined' && chrome.action) {
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });
  }
}

/**
 * 清空生词本
 */
async function clearVocabulary() {
  try {
    await STORAGE.set({ [VOCABULARY_KEY]: [] });
    updateBadge(0);
    return { success: true };
  } catch (error) {
    console.error('清空生词本失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 获取统计信息
 */
async function getStatistics() {
  try {
    const vocabulary = await getAllWords();
    
    const stats = {
      total: vocabulary.length,
      reviewedCount: vocabulary.filter(w => w.reviewCount > 0).length,
      totalReviews: vocabulary.reduce((sum, w) => sum + (w.reviewCount || 0), 0),
      byTags: {},
      recentlyAdded: vocabulary
        .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
        .slice(0, 10)
    };
    
    // 按标签统计
    vocabulary.forEach(w => {
      (w.tags || []).forEach(tag => {
        stats.byTags[tag] = (stats.byTags[tag] || 0) + 1;
      });
    });
    
    return stats;
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return null;
  }
}

// 初始化：更新徽章
(async function initBadge() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const vocabulary = await getAllWords();
    updateBadge(vocabulary.length);
  }
})();

/**
 * Vocabulary List - 生词本列表页面脚本
 */

let allWords = [];
let filteredWords = [];
let wordStack = []; // 多层弹窗堆叠数组

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadVocabulary();
  setupEventListeners();
});

/**
 * 加载生词本
 */
async function loadVocabulary() {
  allWords = await getAllWords();
  filteredWords = [...allWords];
  
  updateStatistics();
  updateTagFilter();
  renderWordList();
}

/**
 * 更新统计信息
 */
function updateStatistics() {
  document.getElementById('total-count').textContent = allWords.length;
  
  const reviewedCount = allWords.filter(w => w.reviewCount > 0).length;
  const unreviewedCount = allWords.length - reviewedCount;
  
  document.getElementById('reviewed-count').textContent = reviewedCount;
  document.getElementById('unreviewed-count').textContent = unreviewedCount;
}

/**
 * 更新标签筛选器（已移除）
 */
function updateTagFilter() {
  // 功能已简化，不再需要标签筛选
}

/**
 * 渲染单词列表
 */
function renderWordList() {
  const unreviewedList = document.getElementById('unreviewed-list');
  const reviewedList = document.getElementById('reviewed-list');
  const emptyState = document.getElementById('empty-state');
  
  // 分类单词
  const unreviewedWords = filteredWords.filter(w => !w.reviewCount || w.reviewCount === 0);
  const reviewedWords = filteredWords.filter(w => w.reviewCount > 0);
  
  // 更新各区域标题的数量
  document.getElementById('unreviewed-section-count').textContent = unreviewedWords.length;
  document.getElementById('reviewed-section-count').textContent = reviewedWords.length;
  
  // 全部为空时显示提示
  if (filteredWords.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    unreviewedList.innerHTML = '<div class="empty-state"><p class="empty-hint">暂无未复习的单词</p></div>';
    reviewedList.innerHTML = '<div class="empty-state"><p class="empty-hint">暂无已复习的单词</p></div>';
    return;
  }
  
  if (emptyState) emptyState.style.display = 'none';
  
  // 渲染未复习单词
  if (unreviewedWords.length === 0) {
    unreviewedList.innerHTML = '<div class="empty-state"><p class="empty-hint">暂无未复习的单词</p></div>';
  } else {
    unreviewedList.innerHTML = unreviewedWords.map((word, index) => {
      return `<span class="word-item" data-word="${word.word}">${word.word}</span>${index < unreviewedWords.length - 1 ? ', ' : ''}`;
    }).join('');
  }
  
  // 渲染已复习单词
  if (reviewedWords.length === 0) {
    reviewedList.innerHTML = '<div class="empty-state"><p class="empty-hint">暂无已复习的单词</p></div>';
  } else {
    reviewedList.innerHTML = reviewedWords.map((word, index) => {
      return `<span class="word-item" data-word="${word.word}">${word.word}</span>${index < reviewedWords.length - 1 ? ', ' : ''}`;
    }).join('');
  }
}

/**
 * 页签切换
 */
function handleTabSwitch(e) {
  const tabName = e.target.dataset.tab;
  
  // 更新按钮状态
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  e.target.classList.add('active');
  
  // 切换内容
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
    content.style.display = 'none';
  });
  
  const targetView = document.getElementById(`${tabName}-view`);
  if (targetView) {
    targetView.classList.add('active');
    targetView.style.display = 'block';
  }
  
  // 如果切换到日期分组视图，渲染日期分组
  if (tabName === 'date-groups') {
    renderDateGroups();
  }
}

/**
 * 按日期分组渲染单词
 */
function renderDateGroups() {
  const container = document.getElementById('date-groups-container');
  const emptyState = document.getElementById('date-empty-state');
  
  if (filteredWords.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }
  
  if (emptyState) emptyState.style.display = 'none';
  
  // 按日期分组
  const groups = {};
  filteredWords.forEach(word => {
    const date = new Date(word.addedAt);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        displayDate: date.toLocaleDateString('zh-CN', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          weekday: 'long'
        }),
        words: []
      };
    }
    groups[dateKey].words.push(word);
  });
  
  // 按日期排序（最近的在前）
  const sortedGroups = Object.values(groups).sort((a, b) => 
    b.date.localeCompare(a.date)
  );
  
  // 渲染各个日期组
  container.innerHTML = sortedGroups.map(group => {
    const wordsHtml = group.words.map((word, index) => {
      return `<span class="word-item" data-word="${word.word}">${word.word}</span>${index < group.words.length - 1 ? ', ' : ''}`;
    }).join('');
    
    return `
      <div class="word-section date-group">
        <h2 class="section-title">
          📅 ${group.displayDate}
          <span class="date-count">${group.words.length} 个单词</span>
        </h2>
        <div class="word-list-simple">
          ${wordsHtml}
        </div>
      </div>
    `;
  }).join('');
  
  // 为日期分组视图中的单词添加点击事件
  container.querySelectorAll('.word-item').forEach(item => {
    item.addEventListener('click', handleCardAction);
  });
}

/**
 * 设置事件监听
 */
function setupEventListeners() {
  // 页签切换
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', handleTabSwitch);
  });
  
  // 搜索
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', handleSearch);
  
  // 导出CSV
  const exportCsvBtn = document.getElementById('export-csv-btn');
  exportCsvBtn.addEventListener('click', handleExportCSV);
  
  // 清空生词本
  const clearAllBtn = document.getElementById('clear-all-btn');
  clearAllBtn.addEventListener('click', handleClearAll);
  
  // 单词点击（事件委托）
  const unreviewedList = document.getElementById('unreviewed-list');
  const reviewedList = document.getElementById('reviewed-list');
  unreviewedList.addEventListener('click', handleCardAction);
  reviewedList.addEventListener('click', handleCardAction);
}

/**
 * 搜索
 */
function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  
  if (!query) {
    filteredWords = [...allWords];
  } else {
    filteredWords = allWords.filter(word => 
      word.word.toLowerCase().includes(query)
    );
  }
  
  renderWordList();
}

/**
 * 标签筛选
 */
function handleFilter() {
  applyFilters();
  renderWordList();
}

/**
 * 应用筛选
 */
function applyFilters() {
  const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  const selectedTag = document.getElementById('tag-filter').value;
  
  filteredWords = allWords.filter(word => {
    // 搜索筛选
    const matchesSearch = !searchQuery || 
      word.word.toLowerCase().includes(searchQuery) ||
      (word.translation && word.translation.includes(searchQuery)) ||
      (word.definition && word.definition.toLowerCase().includes(searchQuery));
    
    // 标签筛选
    const matchesTag = !selectedTag || (word.tags && word.tags.includes(selectedTag));
    
    return matchesSearch && matchesTag;
  });
  
  // 应用排序
  const sortValue = document.getElementById('sort-select').value;
  sortWords(sortValue);
}

/**
 * 排序
 */
function handleSort() {
  const sortValue = document.getElementById('sort-select').value;
  sortWords(sortValue);
  renderWordList();
}

function sortWords(sortValue) {
  const [field, order] = sortValue.split('-');
  
  filteredWords.sort((a, b) => {
    let aVal, bVal;
    
    if (field === 'word') {
      aVal = a.word.toLowerCase();
      bVal = b.word.toLowerCase();
    } else if (field === 'addedAt') {
      aVal = new Date(a.addedAt);
      bVal = new Date(b.addedAt);
    } else if (field === 'reviewCount') {
      aVal = a.reviewCount || 0;
      bVal = b.reviewCount || 0;
    }
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
}

/**
 * 导出CSV
 */
function handleExportCSV() {
  if (allWords.length === 0) {
    showToast('生词本为空，无法导出');
    return;
  }
  
  exportToCSV(allWords);
  showToast('CSV已导出');
}

/**
 * 导出JSON
 */
function handleExportJSON() {
  if (allWords.length === 0) {
    showToast('生词本为空，无法导出');
    return;
  }
  
  exportToJSON(allWords);
  showToast('JSON已导出');
}

/**
 * 导入JSON
 */
async function handleImportJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const result = await importFromJSON(event.target.result);
      
      if (result.success) {
        showToast(`成功导入 ${result.addedCount} 个单词`);
        await loadVocabulary();
      } else {
        showToast('导入失败: ' + result.error);
      }
    } catch (error) {
      showToast('导入失败: 文件格式错误');
    }
  };
  
  reader.readAsText(file);
  e.target.value = ''; // 清空input以便重复导入
}

/**
 * 清空生词本
 */
async function handleClearAll() {
  if (allWords.length === 0) {
    showToast('生词本已经是空的');
    return;
  }
  
  if (!confirm(`确定要清空所有 ${allWords.length} 个单词吗？此操作不可恢复！`)) {
    return;
  }
  
  const result = await clearVocabulary();
  
  if (result.success) {
    showToast('生词本已清空');
    await loadVocabulary();
  } else {
    showToast('清空失败');
  }
}

/**
 * 卡片操作
 */
async function handleCardAction(e) {
  const target = e.target;
  
  // 点击单词项
  if (target.classList.contains('word-item')) {
    const word = target.dataset.word;
    
    // 获取单词元素的位置
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2; // 单词中心位置
    const y = rect.bottom + window.scrollY + 10; // 单词下方留少10px间隙
    
    lookupWord(word, x, y);
  }
}

/**
 * 查询单词（支持多层弹窗）
 */
function lookupWord(word, x, y) {
  showToast('正在查询...');
  
  // 如果没有传入坐标，使用第一层的坐标（嵌套查询）
  if (x === undefined || y === undefined) {
    if (wordStack.length > 0) {
      x = wordStack[0].x;
      y = wordStack[0].y;
    } else {
      // 默认位置
      x = window.innerWidth / 2;
      y = 100;
    }
  }
  
  // 添加loading层
  wordStack.push({
    word: word,
    loading: true,
    data: null,
    error: null,
    x: x,
    y: y
  });
  
  renderPopupStack();
  
  // 查询单词
  chrome.runtime.sendMessage({
    type: 'LOOKUP_WORD',
    word: word
  }, async (response) => {
    const currentIndex = wordStack.length - 1;
    
    if (response && response.success) {
      // 获取收藏信息
      const savedWord = await getWord(word);
      
      wordStack[currentIndex] = {
        word: word,
        loading: false,
        data: response.data,
        savedWord: savedWord,
        error: null,
        x: wordStack[currentIndex].x,
        y: wordStack[currentIndex].y
      };
      
      // 更新复习信息
      if (savedWord) {
        updateReviewInfo(word);
      }
    } else {
      wordStack[currentIndex] = {
        word: word,
        loading: false,
        data: null,
        error: '查询失败',
        x: wordStack[currentIndex].x,
        y: wordStack[currentIndex].y
      };
      showToast('查询失败');
    }
    
    renderPopupStack();
  });
}

/**
 * 渲染弹窗堆栈
 */
function renderPopupStack() {
  const container = document.getElementById('popup-container');
  
  if (wordStack.length === 0) {
    container.classList.remove('active');
    container.innerHTML = '';
    return;
  }
  
  container.classList.add('active');
  container.innerHTML = '';
  
  // 渲染每一层
  wordStack.forEach((wordInfo, index) => {
    const isTopLayer = index === wordStack.length - 1;
    const layer = document.createElement('div');
    layer.className = 'popup-layer';
    layer.dataset.index = index;
    
    // 计算层级样式
    const scale = isTopLayer ? 1 : 0.96;
    const compactLayerHeight = 20;
    
    // 使用第一层的坐标，后续层堆叠
    const baseX = wordStack[0].x;
    const baseY = wordStack[0].y;
    const layerY = baseY + (index * compactLayerHeight);
    
    layer.style.cssText = `
      position: absolute;
      left: ${baseX}px;
      top: ${layerY}px;
      transform: translateX(-50%) scale(${scale});
      transform-origin: top center;
      z-index: ${100 + index};
      transition: all 0.3s ease-out;
      background: ${isTopLayer ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.92)'};
      border: 2px solid ${isTopLayer ? 'rgb(139, 92, 246)' : 'rgba(139, 92, 246, 0.6)'};
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      padding: ${isTopLayer ? '20px' : '14px 20px'};
      min-width: 680px;
      max-width: 90vw;
      backdrop-filter: blur(${isTopLayer ? 0 : 10}px);
      pointer-events: auto;
      cursor: ${isTopLayer ? 'auto' : 'pointer'};
    `;
    
    // 点击旧层返回
    if (!isTopLayer) {
      layer.addEventListener('click', (e) => {
        e.stopPropagation();
        wordStack = wordStack.slice(0, index + 1);
        renderPopupStack();
      });
    }
    
    // 生成内容
    if (wordInfo.loading) {
      layer.innerHTML = '<div class="loading"><div class="spinner"></div><div>Loading...</div></div>';
    } else if (wordInfo.error) {
      layer.innerHTML = `<div class="error">${wordInfo.error}</div>`;
    } else if (wordInfo.data) {
      if (isTopLayer) {
        layer.innerHTML = generateFullPopupHTML(wordInfo.data, wordInfo.savedWord);
      } else {
        layer.innerHTML = generateCompactPopupHTML(wordInfo.data);
      }
    }
    
    container.appendChild(layer);
    
    // 设置事件监听
    if (!wordInfo.loading && !wordInfo.error && wordInfo.data) {
      setupLayerListeners(layer, index);
    }
  });
  
  // 添加背景遮罩
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0, 0, 0, 0.1);
    pointer-events: auto;
  `;
  overlay.addEventListener('click', closePopup);
  container.insertBefore(overlay, container.firstChild);
}

/**
 * 生成紧凑HTML（旧层）
 */
function generateCompactPopupHTML(data) {
  const { word, phoneticUs, phoneticUk, youdaoTags } = data;
  
  let html = `<div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">`;
  html += `<div class="word-title compact-word-text" style="font-size: 20px;">${word}</div>`;
  
  // 音标和发音
  if (phoneticUs) {
    html += `
      <button class="flag-btn compact-flag" data-word="${word}" data-accent="us" title="播放美式发音" style="font-size: 14px; padding: 2px 4px; margin: 0 2px;">🇺🇸</button>
      <span class="phonetic" style="font-size: 11px;">${phoneticUs}</span>`;
  }
  
  if (phoneticUk) {
    html += `
      <button class="flag-btn compact-flag" data-word="${word}" data-accent="uk" title="播放英式发音" style="font-size: 14px; padding: 2px 4px; margin: 0 2px;">🇬🇧</button>
      <span class="phonetic" style="font-size: 11px;">${phoneticUk}</span>`;
  }
  
  // 标签
  if (youdaoTags && youdaoTags.length > 0) {
    html += youdaoTags.map(t => `<span class="tag tag-level" style="font-size: 9px; padding: 1px 4px;">${t}</span>`).join('');
  }
  
  html += `</div>`;
  return html;
}

/**
 * 生成完整HTML（顶层）
 */
function generateFullPopupHTML(data, savedWord) {
  const { word, phoneticUs, phoneticUk, definition, allDefinitions, synonyms, antonyms, examples, translation, baseForm, baseFormType, baseFormTranslation, youdaoTags } = data;
  
  // 格式化收藏日期
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  let html = `
    <button class="close-btn">×</button>
    
    <div class="word-header">
      <div class="word-title-row">
        <div class="word-title" id="word-text" style="cursor: pointer;" title="点击复制单词">${word}</div>
        <button class="copy-btn" id="copy-word-btn" title="复制单词">📋</button>
        <button class="star-btn" id="star-btn" title="收藏到生词本">⭐</button>`;
  
  // 音标组
  if (phoneticUs || phoneticUk) {
    if (phoneticUs) {
      html += `
        <div class="phonetic-group">
          <button class="flag-btn" data-accent="us">🇺🇸</button>
          <span class="phonetic">${phoneticUs}</span>
        </div>`;
    }
    
    if (phoneticUk) {
      html += `
        <div class="phonetic-group">
          <button class="flag-btn" data-accent="uk">🇬🇧</button>
          <span class="phonetic">${phoneticUk}</span>
        </div>`;
    }
  }
  
  // 标签 - 只显示有道标签
  if (youdaoTags && youdaoTags.length > 0) {
    html += youdaoTags.map(t => `<span class="tag tag-level">${t}</span>`).join('');
  }
  
  html += `</div>`; // Close word-title-row
  
  // 释义 - 在word-header内部,单词下方
  if (allDefinitions && allDefinitions.length > 0) {
    html += `<div class="definition" style="margin-top: 6px; font-size: 14px;">`;
    allDefinitions.forEach((defItem, index) => {
      const number = allDefinitions.length > 1 ? `${index + 1}. ` : '';
      const def = typeof defItem === 'string' ? defItem : defItem.definition;
      const syns = typeof defItem === 'object' && defItem.synonyms && defItem.synonyms.length > 0 
        ? ` <span style="color: #8b5cf6; font-style: italic; font-size: 14px;">(syn: ${defItem.synonyms.join(', ')})</span>` 
        : '';
      html += `<div style="margin-bottom: ${index < allDefinitions.length - 1 ? '4px' : '0'}; font-size: 14px;">${number}${def}${syns}</div>`;
    });
    html += `</div>`;
  } else if (definition) {
    html += `<div class="definition" style="margin-top: 6px; font-size: 14px;">${definition}</div>`;
  }
  
  html += `</div>`; // Close word-header
  
  // 近义词和反义词在一个区块
  if ((synonyms && synonyms.length > 0) || (antonyms && antonyms.length > 0)) {
    html += `<div class="section" style="display: flex; gap: 12px; flex-wrap: wrap;">`;
    
    // 近义词
    if (synonyms && synonyms.length > 0) {
      html += `
        <div class="synonym-section" style="flex: 1; min-width: 200px;">
          <span class="section-label label-synonym">近义词</span>
          <div class="word-tags-list">
            ${synonyms.map(syn => `<span class="word-tag synonym">${syn}</span>`).join('')}
          </div>
        </div>
      `;
    }
    
    // 反义词
    if (antonyms && antonyms.length > 0) {
      html += `
        <div class="antonym-section" style="flex: 1; min-width: 200px;">
          <span class="section-label label-antonym">反义词</span>
          <div class="word-tags-list">
            ${antonyms.map(ant => `<span class="word-tag antonym">${ant}</span>`).join('')}
          </div>
        </div>
      `;
    }
    
    html += `</div>`;
  }
  
  // 例句,带查询单词高亮
  if (examples && examples.length > 0) {
    html += examples.map(ex => {
      const highlightedSentence = ex.sentence.replace(new RegExp(`\\b${word}\\b`, 'gi'), `<span class="highlight">$&</span>`);
      return `
        <div class="example">
          <div class="example-text">${highlightedSentence}</div>
          <div class="example-source">— ${ex.source}${ex.year ? ` (${ex.year})` : ''}</div>
        </div>
      `;
    }).join('');
  }
  
  // 中文翻译 (可折叠)
  if (translation) {
    html += `
      <div class="section" style="padding: 8px 12px; margin-bottom: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" class="translation-toggle">
          <span style="color: #8b5cf6; font-weight: 600; font-size: 13px;">中文翻译</span>
          <span style="color: #8b5cf6; font-size: 12px;" class="translation-icon">▼</span>
        </div>
        <div class="translation-content" style="color: #475569; font-size: 13px; line-height: 1.4; margin-top: 6px; display: none;">
          ${translation}
        </div>
      </div>
    `;
  }
  
  // 词形变化 (Base Form) - 可折叠
  if (baseForm) {
    const typeLabel = baseFormType === 'verb' ? '动词' : baseFormType === 'adjective' ? '形容词' : baseFormType === 'noun' ? '名词' : '';
    html += `
      <div class="section" style="padding: 8px 12px; margin-bottom: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" class="baseform-toggle">
          <span style="color: #8b5cf6; font-weight: 600; font-size: 13px;">词形变化</span>
          <span style="color: #8b5cf6; font-size: 12px;" class="baseform-icon">▼</span>
        </div>
        <div class="baseform-content" style="color: #475569; font-size: 13px; line-height: 1.4; margin-top: 6px; display: none;">
          <span style="cursor: pointer;">${baseForm}</span>${typeLabel ? ` (${typeLabel})` : ''}${baseFormTranslation ? ` — ${baseFormTranslation}` : ''}
        </div>
      </div>
    `;
  }
  
  // 收藏信息和复习状态
  if (savedWord) {
    const isReviewed = savedWord.reviewCount > 0;
    html += `
      <div class="section" style="padding: 12px; background: #f8fafc; border-radius: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="font-size: 12px; color: #64748b;">
            📅 收藏时间: <span style="color: #0f172a; font-weight: 500;">${formatDate(savedWord.addedAt)}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: #475569;">
            <input type="checkbox" id="review-checkbox" ${isReviewed ? 'checked' : ''} 
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #8b5cf6;">
            <span style="font-weight: 500;">已复习</span>
          </label>
          ${savedWord.lastReviewed ? `
            <span style="font-size: 12px; color: #94a3b8;">
              (最后复习: ${formatDate(savedWord.lastReviewed)})
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  return html;
}

/**
 * 设置层级事件监听
 */
function setupLayerListeners(layer, layerIndex) {
  const wordInfo = wordStack[layerIndex];
  const isTopLayer = layerIndex === wordStack.length - 1;
  
  // 拖动功能
  const wordHeader = layer.querySelector('.word-header');
  if (wordHeader && isTopLayer) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let animationFrameId = null;
    
    wordHeader.addEventListener('mousedown', (e) => {
      // 只忽略按钮点击,允许在其他任何地方拖动
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
      }
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = layer.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      
      // 禁用过渡动画以提升拖动流畅度
      layer.style.transition = 'none';
      
      e.preventDefault();
    });
    
    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      // 使用requestAnimationFrame优化性能
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newLeft = initialLeft + deltaX;
        const newTop = initialTop + deltaY;
        
        // 更新弹窗位置
        layer.style.left = newLeft + 'px';
        layer.style.top = newTop + 'px';
      });
    };
    
    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        // 恢复过渡动画
        layer.style.transition = '';
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      }
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // 清理事件监听器
    const cleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
    
    // 存储清理函数以便后续调用
    layer._dragCleanup = cleanup;
  }
  
  // 关闭按钮
  const closeBtn = layer.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopup();
    });
  }
  
  // 发音按钮
  const flagBtns = layer.querySelectorAll('.flag-btn');
  flagBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = wordInfo.word.toLowerCase().replace(/[^a-z]/g, '');
      const accent = btn.dataset.accent;
      const type = accent === 'us' ? 0 : 1;
      const audioUrl = `https://dict.youdao.com/dictvoice?type=${type}&audio=${word}`;
      new Audio(audioUrl).play().catch(err => console.error('Audio error:', err));
    });
  });
  
  // 仅顶层功能
  if (isTopLayer) {
    // 复制按钮
    const copyBtn = layer.querySelector('#copy-word-btn');
    const wordText = layer.querySelector('#word-text');
    
    const copyWord = () => {
      const word = wordInfo.word;
      navigator.clipboard.writeText(word).then(() => {
        if (copyBtn) {
          copyBtn.textContent = '✓';
          copyBtn.style.color = '#10b981';
        }
        if (wordText) {
          wordText.style.color = '#10b981';
        }
        
        setTimeout(() => {
          if (copyBtn) {
            copyBtn.textContent = '📋';
            copyBtn.style.color = '';
          }
          if (wordText) {
            wordText.style.color = '';
          }
        }, 1000);
        
        showToast('已复制: ' + word);
      }).catch(err => {
        console.error('复制失败:', err);
        showToast('复制失败');
      });
    };
    
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyWord();
      });
    }
    
    if (wordText) {
      wordText.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyWord();
      });
    }
    
    // 收藏按钮
    const starBtn = layer.querySelector('#star-btn');
    if (starBtn && typeof isWordSaved === 'function') {
      // 检查是否已收藏
      isWordSaved(wordInfo.word).then(isSaved => {
        if (isSaved) {
          starBtn.classList.add('saved');
          starBtn.title = '取消收藏';
        }
      }).catch(err => {
        console.error('检查收藏状态失败:', err);
      });
      
      starBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (typeof saveWord !== 'function' || typeof removeWord !== 'function') {
          showToast('生词本功能加载中，请稍后再试');
          return;
        }
        
        const isSaved = starBtn.classList.contains('saved');
        starBtn.style.pointerEvents = 'none';
        
        try {
          if (isSaved) {
            const result = await removeWord(wordInfo.word);
            if (result.success) {
              starBtn.classList.remove('saved');
              starBtn.title = '收藏到生词本';
              showToast('已取消收藏');
            } else {
              showToast('取消收藏失败');
            }
          } else {
            const wordData = {
              word: wordInfo.word,
              phonetic: wordInfo.data.phonetic,
              phoneticUs: wordInfo.data.phoneticUs,
              phoneticUk: wordInfo.data.phoneticUk,
              translation: wordInfo.data.translation,
              definition: wordInfo.data.definition,
              allDefinitions: wordInfo.data.allDefinitions,
              examples: wordInfo.data.examples,
              tags: wordInfo.data.youdaoTags || [],
              synonyms: wordInfo.data.synonyms || [],
              baseForm: wordInfo.data.baseForm,
              baseFormTranslation: wordInfo.data.baseFormTranslation
            };
            
            const result = await saveWord(wordData);
            if (result && result.success) {
              starBtn.classList.add('saved');
              starBtn.title = '取消收藏';
              showToast(result.isNew ? '✨ 已收藏到生词本' : '📝 已更新生词本');
              // 刷新当前savedWord状态
              wordInfo.savedWord = await getWord(wordInfo.word);
            } else {
              showToast('收藏失败: ' + (result?.error || '未知错误'));
            }
          }
        } catch (error) {
          console.error('收藏操作失败:', error);
          showToast('操作失败: ' + error.message);
        } finally {
          starBtn.style.pointerEvents = '';
        }
      });
    }
    
    // 翻译折叠
    const translationToggle = layer.querySelector('.translation-toggle');
    const translationContent = layer.querySelector('.translation-content');
    const translationIcon = layer.querySelector('.translation-icon');
    
    if (translationToggle && translationContent && translationIcon) {
      translationToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = translationContent.style.display === 'none';
        translationContent.style.display = isHidden ? 'block' : 'none';
        translationIcon.textContent = isHidden ? '▲' : '▼';
      });
    }
    
    // 词形变化折叠
    const baseformToggle = layer.querySelector('.baseform-toggle');
    const baseformContent = layer.querySelector('.baseform-content');
    const baseformIcon = layer.querySelector('.baseform-icon');
    
    if (baseformToggle && baseformContent && baseformIcon) {
      baseformToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = baseformContent.style.display === 'none';
        baseformContent.style.display = isHidden ? 'block' : 'none';
        baseformIcon.textContent = isHidden ? '▲' : '▼';
      });
    }
    
    // 复习勾选框
    const reviewCheckbox = layer.querySelector('#review-checkbox');
    if (reviewCheckbox && wordInfo.savedWord) {
      reviewCheckbox.addEventListener('change', async (e) => {
        e.stopPropagation();
        const isChecked = e.target.checked;
        
        if (isChecked) {
          await updateReviewInfo(wordInfo.word);
          showToast('已标记为复习');
        } else {
          // 重置reviewCount
          const { vocabulary = [] } = await STORAGE.get(VOCABULARY_KEY);
          const wordIndex = vocabulary.findIndex(w => w.word === wordInfo.word);
          if (wordIndex >= 0) {
            vocabulary[wordIndex].reviewCount = 0;
            vocabulary[wordIndex].lastReviewed = null;
            await STORAGE.set({ [VOCABULARY_KEY]: vocabulary });
            showToast('已取消复习标记');
          }
        }
        
        await loadVocabulary();
      });
    }
    
    // 近义词和反义词点击（嵌套查询）
    const wordTags = layer.querySelectorAll('.word-tag');
    wordTags.forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        const clickedWord = tag.textContent.trim();
        lookupWord(clickedWord);
      });
    });
    
    // 双击选中文本查询（在顶层弹窗的所有文本区域）
    const textElements = layer.querySelectorAll('.definition, .example-text, .section');
    textElements.forEach(element => {
      element.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (selectedText && selectedText.length > 0) {
          // 只查询单个单词（不包含空格）
          const words = selectedText.split(/\s+/);
          if (words.length === 1 && /^[a-zA-Z]+$/.test(selectedText)) {
            lookupWord(selectedText.toLowerCase());
          }
        }
      });
    });
  }
}

/**
 * 设置发音按钮（废弃，保留兼容）
 */
function setupAudioButtons(container, word) {
  const flagBtns = container.querySelectorAll('.flag-btn');
  flagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const accent = btn.dataset.accent;
      const audioUrl = accent === 'us' 
        ? `https://dict.youdao.com/dictvoice?audio=${word}&type=1`
        : `https://dict.youdao.com/dictvoice?audio=${word}&type=2`;
      const audio = new Audio(audioUrl);
      audio.play();
    });
  });
}

/**
 * 关闭弹窗
 */
function closePopup() {
  // 清理拖动事件监听器
  const layers = document.querySelectorAll('.popup-layer');
  layers.forEach(layer => {
    if (layer._dragCleanup) {
      layer._dragCleanup();
    }
  });
  
  wordStack = [];
  const container = document.getElementById('popup-container');
  container.classList.remove('active');
  container.innerHTML = '';
}

/**
 * 显示Toast
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// content.js - UI Handler (Word Selection & Popup Display)
console.log('LinguaContext Content Script Loaded');

// State
let currentSelection = null;
let shadowRoot = null;
let popupContainer = null;
let wordStack = []; // 多层弹窗堆叠数组

// ===== Collocation Patterns =====
// 常见的动词短语介词/副词
const phrasalVerbParticles = new Set([
  'up', 'down', 'out', 'off', 'on', 'in', 'away', 'back', 'over', 'through',
  'about', 'around', 'forward', 'ahead', 'along', 'by', 'apart', 'aside'
]);

// 常见的搭配词组 (verb + noun, adj + noun, etc)
const commonCollocations = [
  // Verb + Noun
  { pattern: /\b(make|take|do|have|give|get|pay|catch|break|keep|run|hold|bring|put|set|turn|come|go|see|find|tell|ask|work|call|try|feel|leave|put|mean|keep|let|begin|start|show|play|seem|become|write|sit|stand|lose|speak|read|spend|understand|face|watch|follow|stop|create|buy|win|cut|finish|reach|choose|fall|push|pull|meet|include|continue|learn|change|lead|open|walk|move|live|believe|allow|add|expect|remember|remain|express|suppose|accept|decide|contain|suggest|produce|send|apply|build|protect|require|enjoy|develop|perform|wait|attend|involve|achieve|receive|serve|reduce|manage|indicate)\s+(\w+)\b/gi },
  // Adj + Noun (常见形容词)
  { pattern: /\b(good|new|first|last|long|great|little|own|other|old|right|big|high|different|small|large|next|early|young|important|few|public|bad|same|able|general|particular|certain|best|possible|free|clear|available|likely|recent|major|late|strong|happy|full|special|fine|difficult|beautiful|interesting|correct|complete|proper|ready|top|common|poor|simple|aware|usual|normal|due|financial|safe|serious|necessary|useful|obvious|former|responsible|essential|specific|suitable|appropriate)\s+(\w+)\b/gi },
  // Adv + Adj/Verb (常见副词)
  { pattern: /\b(very|really|quite|too|so|more|most|well|just|even|still|also|only|never|always|often|sometimes|usually|generally|particularly|especially|extremely|highly|completely|totally|absolutely|perfectly|entirely|fully|deeply|strongly|clearly|certainly|obviously|definitely|probably|possibly|exactly|directly|quickly|slowly|easily|hardly|nearly|almost|mainly|largely|increasingly|relatively|simply|basically|essentially|naturally|actually|literally)\s+(\w+)\b/gi },
  // 动词短语 (verb + particle)
  { pattern: /\b(\w+)\s+(up|down|out|off|on|in|away|back|over|through|about|around)\b/gi, checkPhrasal: true }
];

// 识别句子中的搭配词
function highlightCollocations(sentence) {
  let result = sentence;
  const matches = [];
  
  // 收集所有匹配的搭配
  commonCollocations.forEach(({ pattern, checkPhrasal }) => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(sentence)) !== null) {
      if (checkPhrasal) {
        // 检查是否为真正的动词短语
        const verb = match[1];
        const particle = match[2];
        if (phrasalVerbParticles.has(particle.toLowerCase())) {
          matches.push({
            text: match[0],
            index: match.index,
            length: match[0].length
          });
        }
      } else {
        matches.push({
          text: match[0],
          index: match.index,
          length: match[0].length
        });
      }
    }
  });
  
  // 按位置排序并去重
  matches.sort((a, b) => a.index - b.index);
  const uniqueMatches = [];
  let lastEnd = -1;
  
  for (const match of matches) {
    if (match.index >= lastEnd) {
      uniqueMatches.push(match);
      lastEnd = match.index + match.length;
    }
  }
  
  // 从后往前替换,避免位置错乱
  for (let i = uniqueMatches.length - 1; i >= 0; i--) {
    const match = uniqueMatches[i];
    const before = result.substring(0, match.index);
    const highlighted = `<span class="collocation">${match.text}</span>`;
    const after = result.substring(match.index + match.length);
    result = before + highlighted + after;
  }
  
  return result;
}

// 高亮查询单词和搭配词
function highlightExampleSentence(sentence, queryWord) {
  let result = sentence;
  const highlights = [];
  
  // 1. 收集查询单词的所有匹配位置
  const wordPattern = new RegExp(`\\b(${queryWord})\\b`, 'gi');
  let match;
  while ((match = wordPattern.exec(sentence)) !== null) {
    highlights.push({
      text: match[0],
      index: match.index,
      length: match[0].length,
      type: 'query' // 查询单词
    });
  }
  
  // 2. 收集搭配词的匹配位置
  commonCollocations.forEach(({ pattern, checkPhrasal }) => {
    const regex = new RegExp(pattern, 'gi');
    while ((match = regex.exec(sentence)) !== null) {
      // 检查搭配是否包含查询单词
      const collocationText = match[0].toLowerCase();
      const queryLower = queryWord.toLowerCase();
      
      if (collocationText.includes(queryLower)) {
        if (checkPhrasal) {
          const verb = match[1];
          const particle = match[2];
          if (phrasalVerbParticles.has(particle.toLowerCase())) {
            highlights.push({
              text: match[0],
              index: match.index,
              length: match[0].length,
              type: 'collocation' // 搭配词
            });
          }
        } else {
          highlights.push({
            text: match[0],
            index: match.index,
            length: match[0].length,
            type: 'collocation' // 搭配词
          });
        }
      }
    }
  });
  
  // 3. 排序并去重，优先保留搭配（因为搭配通常包含查询单词）
  highlights.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    // 如果位置相同，优先保留搭配
    if (a.type === 'collocation') return -1;
    if (b.type === 'collocation') return 1;
    return 0;
  });
  
  const uniqueHighlights = [];
  let lastEnd = -1;
  
  for (const highlight of highlights) {
    if (highlight.index >= lastEnd) {
      uniqueHighlights.push(highlight);
      lastEnd = highlight.index + highlight.length;
    }
  }
  
  // 4. 从后往前替换，避免位置错乱
  for (let i = uniqueHighlights.length - 1; i >= 0; i--) {
    const highlight = uniqueHighlights[i];
    const before = result.substring(0, highlight.index);
    let highlighted;
    
    if (highlight.type === 'collocation') {
      // 搭配词：紫色
      highlighted = `<span class="collocation">${highlight.text}</span>`;
    } else {
      // 查询单词：蓝色加粗
      highlighted = `<span style="color: #2563eb; font-weight: 600;">${highlight.text}</span>`;
    }
    
    const after = result.substring(highlight.index + highlight.length);
    result = before + highlighted + after;
  }
  
  return result;
}

// Initialize Shadow DOM for isolated styling
function initializeShadowDOM() {
  if (shadowRoot) return;
  
  // Create shadow host
  const shadowHost = document.createElement('div');
  shadowHost.id = 'linguacontext-shadow-host';
  shadowHost.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;';
  document.body.appendChild(shadowHost);
  
  // Attach shadow root
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  
  // Create popup container
  popupContainer = document.createElement('div');
  popupContainer.id = 'linguacontext-popup';
  popupContainer.className = 'hidden';
  
  // Add styles - Matching local app exactly
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    /* Selection highlighting - matching local app (brand-100 bg, brand-900 text) */
    ::selection {
      background-color: #e0f2fe;
      color: #0c4a6e;
    }
    
    ::-moz-selection {
      background-color: #e0f2fe;
      color: #0c4a6e;
    }
    
    #linguacontext-popup {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    @keyframes toastFadeIn {
      from {
        opacity: 0;
        transform: translateX(-5px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .hidden {
      display: none !important;
    }
    
    .popup-layer {
      position: relative;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      overflow-y: auto;
      overflow-x: hidden;
    }
    
    /* 美化滚动条 */
    .popup-layer::-webkit-scrollbar {
      width: 8px;
    }
    
    .popup-layer::-webkit-scrollbar-track {
      background: rgba(148, 163, 184, 0.1);
      border-radius: 4px;
    }
    
    .popup-layer::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.3);
      border-radius: 4px;
      transition: background 0.2s;
    }
    
    .popup-layer::-webkit-scrollbar-thumb:hover {
      background: rgba(139, 92, 246, 0.5);
    }
    
    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: transparent;
      border: none;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 24px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      z-index: 10;
      line-height: 1;
    }
    
    .close-btn:hover {
      color: #64748b;
      transform: scale(1.15);
    }
    
    .copy-btn {
      background: transparent;
      border: none;
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      margin-left: 8px;
      opacity: 0.6;
      transition: all 0.2s;
      border-radius: 4px;
    }
    
    .copy-btn:hover {
      opacity: 1;
      background: rgba(59, 130, 246, 0.1);
      transform: scale(1.1);
    }
    
    .copy-btn:active {
      transform: scale(0.95);
    }
    
    .star-btn {
      background: transparent;
      border: none;
      font-size: 22px;
      cursor: pointer;
      padding: 4px 8px;
      margin-left: 8px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 6px;
      line-height: 1;
      filter: grayscale(1);
      opacity: 0.4;
    }
    
    .star-btn:hover {
      filter: grayscale(0);
      opacity: 0.7;
      transform: scale(1.15) rotate(-10deg);
    }
    
    .star-btn:active {
      transform: scale(0.9);
    }
    
    .star-btn.saved {
      filter: grayscale(0);
      opacity: 1;
      animation: starPulse 0.5s ease-out;
    }
    
    @keyframes starPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.3) rotate(15deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    
    .word-header {
      background: rgba(248, 250, 252, 0.5);
      padding: 12px 16px;
      border-radius: 12px;
      margin-bottom: 6px;
      cursor: move;
      user-select: none;
    }
    
    .word-header:active {
      cursor: grabbing;
      background: rgba(248, 250, 252, 0.8);
    }
    
    .word-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }
    
    .word-title {
      font-size: 28px;
      font-weight: 700;
      color: #0369a1;
      letter-spacing: -0.5px;
      font-family: Georgia, "Times New Roman", serif;
    }
    
    .phonetic-section {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: nowrap;
    }
    
    .phonetic-group {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-right: 8px;
    }
    
    .flag-btn {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: transform 0.2s, opacity 0.2s;
      opacity: 0.8;
    }
    
    .flag-btn:hover {
      transform: scale(1.2);
      opacity: 1;
    }
    
    .flag-btn:active {
      transform: scale(1.1);
    }
    
    .phonetic {
      color: #64748b;
      font-family: "Doulos SIL", "Charis SIL", "Gentium Plus", "DejaVu Sans", "Lucida Sans Unicode", "Arial Unicode MS", serif;
      font-size: 14px;
      font-weight: 400;
    }
    
    .word-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    
    .tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      line-height: 1.5;
      white-space: nowrap;
      flex-shrink: 0;
    }
    
    .tag-collins {
      background: #fef3c7;
      color: #92400e;
    }
    
    .tag-oxford {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .tag-level {
      background: #d1fae5;
      color: #065f46;
    }
    
    .loading {
      text-align: center;
      padding: 20px;
      color: #64748b;
    }
    
    .spinner {
      border: 3px solid #f1f5f9;
      border-top-color: #3b82f6;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 12px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .section {
      margin-bottom: 8px;
      padding: 12px;
      background: rgba(248, 250, 252, 0.5);
      border-radius: 12px;
    }
    
    .definition {
      color: #475569;
      line-height: 1.3;
      font-size: 14px;
      margin-bottom: 4px;
    }
    
    .synonym-section,
    .antonym-section {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      margin-bottom: 0;
    }
    
    .section-label {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      flex-shrink: 0;
    }
    
    .label-synonym {
      background: #dcfce7;
      color: #16a34a;
    }
    
    .label-antonym {
      background: #fecaca;
      color: #dc2626;
    }
    
    .word-tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      flex: 1;
    }
    
    .word-tag {
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }
    
    .word-tag.synonym {
      background: #dcfce7;
      color: #15803d;
    }
    
    .word-tag.synonym:hover {
      background: #bbf7d0;
      transform: translateY(-1px);
    }
    
    .word-tag.antonym {
      background: #fecaca;
      color: #b91c1c;
    }
    
    .word-tag.antonym:hover {
      background: #fca5a5;
      transform: translateY(-1px);
    }
    
    .example {
      color: #475569;
      line-height: 1.3;
      font-size: 14px;
      padding: 6px 8px;
      background: rgba(248, 250, 252, 0.5);
      border-radius: 12px;
      margin-bottom: 4px;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    
    .example-text {
      cursor: text;
      user-select: text;
      flex: 1;
    }
    
    .example-source {
      font-size: 10px;
      color: #64748b;
      white-space: nowrap;
      flex-shrink: 0;
    }
    
    .collocation {
      color: #8b5cf6;
      font-weight: 600;
    }
    
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }
    
    .btn {
      flex: 1;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    
    .btn-primary {
      background: linear-gradient(to right, #10b981, #14b8a6);
      color: white;
    }
    
    .btn-primary:hover {
      background: linear-gradient(to right, #059669, #0d9488);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .btn-secondary {
      background: #f1f5f9;
      color: #64748b;
    }
    
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    
    .error {
      color: #dc2626;
      padding: 16px;
      background: #fef2f2;
      border-radius: 12px;
      font-size: 14px;
      border: 1px solid #fecaca;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
  `;
  
  shadowRoot.appendChild(style);
  shadowRoot.appendChild(popupContainer);
}

// Get selected text and context sentence
function getSelectionContext() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;
  
  const selectedText = selection.toString().trim();
  if (!selectedText) return null;
  
  // Get the sentence containing the selection
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const textNode = container.nodeType === Node.TEXT_NODE ? container : container.firstChild;
  
  let contextSentence = selectedText;
  
  if (textNode) {
    const fullText = textNode.textContent || '';
    const sentenceMatch = fullText.match(/[^.!?]*[.!?]/g);
    
    if (sentenceMatch) {
      for (const sentence of sentenceMatch) {
        if (sentence.includes(selectedText)) {
          contextSentence = sentence.trim();
          break;
        }
      }
    } else {
      contextSentence = fullText.trim().substring(0, 200);
    }
  }
  
  const rect = range.getBoundingClientRect();
  
  const coords = {
    word: selectedText,
    sentence: contextSentence,
    x: rect.left + rect.width / 2,
    y: rect.bottom + 10
  };
  
  console.log('Selection coords:', coords, 'rect:', rect);
  
  return coords;
}

// Show popup at position
function showPopup(x, y) {
  if (!popupContainer) return;
  
  popupContainer.classList.remove('hidden');
  
  // Position popup
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Get popup dimensions
  const popupRect = popupContainer.getBoundingClientRect();
  
  // Center horizontally around the selection point
  let left = x - popupRect.width / 2;
  
  // Show popup below the selection (matching local app)
  let top = y;
  
  // Adjust if popup goes off-screen horizontally
  if (left < 10) {
    left = 10;
  } else if (left + popupRect.width > viewportWidth - 10) {
    left = viewportWidth - popupRect.width - 10;
  }
  
  // If popup goes off-screen at the bottom, show it above the selection
  if (top + popupRect.height > viewportHeight + window.scrollY - 10) {
    top = y - popupRect.height - 40;
  }
  
  popupContainer.style.left = `${left}px`;
  popupContainer.style.top = `${top}px`;
}

// Hide popup
function hidePopup() {
  wordStack = [];
  if (popupContainer) {
    popupContainer.classList.add('hidden');
    popupContainer.innerHTML = '';
  }
  currentSelection = null;
  window.getSelection()?.removeAllRanges();
}

// Show toast notification
function showToast(message, duration = 2000) {
  // Remove existing toast if any
  const existingToast = shadowRoot.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Find the top popup layer (where the star button is)
  const topLayer = shadowRoot.querySelector('.popup-layer:not(.hidden)');
  if (!topLayer) return;
  
  const starBtn = topLayer.querySelector('#star-btn');
  if (!starBtn) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  
  // Get star button position
  const starRect = starBtn.getBoundingClientRect();
  const layerRect = topLayer.getBoundingClientRect();
  
  toast.style.cssText = `
    position: absolute;
    top: ${starRect.top - layerRect.top + 2}px;
    left: ${starRect.right - layerRect.left + 4}px;
    background: rgba(15, 23, 42, 0.9);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    z-index: 10;
    pointer-events: none;
    white-space: nowrap;
    opacity: 0;
    animation: toastFadeIn 0.2s ease forwards;
  `;
  
  topLayer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// Render the entire popup stack
function renderPopupStack() {
  if (!popupContainer || wordStack.length === 0) {
    if (popupContainer) {
      popupContainer.classList.add('hidden');
      popupContainer.innerHTML = '';
    }
    return;
  }
  
  popupContainer.classList.remove('hidden');
  popupContainer.innerHTML = '';
  
  // Add background overlay
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0, 0, 0, 0.1);
    pointer-events: auto;
  `;
  overlay.addEventListener('click', hidePopup);
  popupContainer.appendChild(overlay);
  
  // Render each layer in the stack
  wordStack.forEach((wordInfo, index) => {
    const isTopLayer = index === wordStack.length - 1;
    const depthFromTop = wordStack.length - 1 - index;
    
    // Create popup layer
    const layer = document.createElement('div');
    layer.className = 'popup-layer';
    layer.dataset.index = index;
    
    // Calculate positioning - popup appears below the selected word
    const scale = isTopLayer ? 1 : 0.94;
    const compactLayerHeight = 80; // 增加间距从60到80
    
    // Get position from each word's coordinates
    const currentWord = wordStack[index];
    let topPosition = currentWord.y;
    let leftPosition = currentWord.x;
    
    // For stacked layers, use first word position and stack vertically
    if (index > 0) {
      topPosition = wordStack[0].y + (compactLayerHeight * index);
      leftPosition = wordStack[0].x;
    }
    
    // 计算弹窗的最大高度
    const viewportHeight = window.innerHeight;
    const maxPopupHeight = isTopLayer ? viewportHeight - 40 : 70;
    
    layer.style.cssText = `
      position: fixed;
      left: ${leftPosition}px;
      top: ${topPosition}px;
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
      max-height: ${maxPopupHeight}px;
      backdrop-filter: blur(${isTopLayer ? 0 : 10}px);
      pointer-events: auto;
      cursor: ${isTopLayer ? 'auto' : 'pointer'};
    `;
    
    // Click old layer to return to it
    if (!isTopLayer) {
      layer.addEventListener('click', (e) => {
        e.stopPropagation();
        wordStack = wordStack.slice(0, index + 1);
        renderPopupStack();
      });
    }
    
    // Generate content
    if (wordInfo.loading) {
      layer.innerHTML = '<div class="loading"><div class="spinner"></div><div>Loading...</div></div>';
    } else if (wordInfo.error) {
      layer.innerHTML = `<div class="error">${wordInfo.error}</div>`;
    } else if (wordInfo.data) {
      if (isTopLayer) {
        layer.innerHTML = generateFullPopupHTML(wordInfo.data, wordInfo.savedWord);
      } else {
        // Old layers show compact view
        layer.innerHTML = generateCompactPopupHTML(wordInfo.data);
      }
    }
    
    popupContainer.appendChild(layer);
    
    // Setup event listeners for each layer (including compact views)
    if (!wordInfo.loading && !wordInfo.error && wordInfo.data) {
      setupEventListeners(index);
    }
  });
}

// Generate compact HTML for old layers
function generateCompactPopupHTML(data) {
  const { word, phoneticUs, phoneticUk, youdaoTags } = data;
  
  let html = `<div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;">`;
  html += `<div class="word-title compact-word-text" style="font-size: 20px; cursor: pointer;" title="点击复制单词">${word}</div>`;
  html += `<button class="copy-btn compact-copy-btn" title="复制单词" style="font-size: 16px; padding: 2px 6px; margin-left: 4px;">📋</button>`;
  
  // Phonetics with audio buttons
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
  
  // Tags - only show Youdao tags
  if (youdaoTags && youdaoTags.length > 0) {
    html += youdaoTags.map(t => `<span class="tag tag-level" style="font-size: 9px; padding: 1px 4px;">${t}</span>`).join('');
  }
  
  html += `</div>`;
  return html;
}

// Generate full HTML for top layer
function generateFullPopupHTML(data, savedWord) {
  const { word, phonetic, phoneticUs, phoneticUk, audioUs, audioUk, definition, allDefinitions,
          partOfSpeech, synonyms, antonyms, examples, translation, baseForm, baseFormType, baseFormTranslation, youdaoTags } = data;
  
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
    <button class="close-btn" id="close-popup">×</button>
    
    <div class="word-header">
      <div class="word-title-row">
        <div class="word-title" id="word-text" style="cursor: pointer;" title="点击复制单词">${word}</div>
        <button class="copy-btn" id="copy-word-btn" title="复制单词">📋</button>
        <button class="star-btn" id="star-btn" title="收藏到生词本">⭐</button>`;
  
  // Phonetics with flag icons - Vocabulary.com style
  if (phoneticUs || phoneticUk) {
    // US phonetic with flag icon
    if (phoneticUs) {
      html += `
        <div class="phonetic-group">
          <button class="flag-btn" id="us-btn" data-accent="US" title="点击播放美式发音">🇺🇸</button>
          <span class="phonetic" id="phonetic-us-display" title="美式音标 (来自 Wiktionary)">${phoneticUs}</span>
        </div>`;
    }
    
    // UK phonetic with flag icon
    if (phoneticUk) {
      html += `
        <div class="phonetic-group">
          <button class="flag-btn" id="uk-btn" data-accent="UK" title="点击播放英式发音">🇬🇧</button>
          <span class="phonetic" id="phonetic-uk-display" title="英式音标 (来自 Wiktionary)">${phoneticUk}</span>
        </div>`;
    }
  }
  
  // Tags on same line as word - only show Youdao tags
  if (youdaoTags && youdaoTags.length > 0) {
    html += youdaoTags.map(t => `<span class="tag tag-level">${t}</span>`).join('');
  }
  
  html += `</div>`; // Close word-title-row
  
  // Definitions - inside word-header, below word
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
  
  // Synonyms and Antonyms in one block
  if ((synonyms && synonyms.length > 0) || (antonyms && antonyms.length > 0)) {
    html += `<div class="section" style="display: flex; gap: 12px; flex-wrap: wrap; padding: 6px 12px;">`;
    
    // Synonyms
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
    
    // Antonyms
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
  
  // Examples with query word and collocation highlighting
  if (examples && examples.length > 0) {
    html += examples.map(ex => {
      const highlightedSentence = highlightExampleSentence(ex.sentence, word);
      return `
        <div class="example">
          <div class="example-text">${highlightedSentence}</div>
          <div class="example-source">— ${ex.source}${ex.year ? ` (${ex.year})` : ''}</div>
        </div>
      `;
    }).join('');
  }
  
  // Chinese Translation (collapsible)
  if (translation) {
    html += `
      <div class="section" style="padding: 8px 12px; margin-bottom: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" id="translation-toggle">
          <span style="color: #8b5cf6; font-weight: 600; font-size: 13px;">中文翻译</span>
          <span style="color: #8b5cf6; font-size: 12px;" id="translation-icon">▼</span>
        </div>
        <div id="translation-content" style="color: #475569; font-size: 13px; line-height: 1.4; margin-top: 6px; display: none;">
          ${translation}
        </div>
      </div>
    `;
  }
  
  // Base Form (Word Origin) - collapsible
  if (baseForm) {
    const typeLabel = baseFormType === 'verb' ? '动词' : baseFormType === 'adjective' ? '形容词' : baseFormType === 'noun' ? '名词' : '';
    html += `
      <div class="section" style="padding: 8px 12px; margin-bottom: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" id="baseform-toggle">
          <span style="color: #8b5cf6; font-weight: 600; font-size: 13px;">词形变化</span>
          <span style="color: #8b5cf6; font-size: 12px;" id="baseform-icon">▼</span>
        </div>
        <div id="baseform-content" style="color: #475569; font-size: 13px; line-height: 1.4; margin-top: 6px; display: none;">
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
  
  // Actions
  html += `
    <div class="actions">
      <button class="btn btn-primary" id="save-word">💾 Save</button>
      <button class="btn btn-secondary" id="close-popup-btn">Close</button>
    </div>
  `;
  
  return html;
}

// Setup event listeners for a specific layer
function setupEventListeners(layerIndex) {
  const layers = shadowRoot.querySelectorAll('.popup-layer');
  const layer = layers[layerIndex];
  if (!layer) return;
  
  const wordInfo = wordStack[layerIndex];
  if (!wordInfo || !wordInfo.data) return;
  
  const cleanWord = wordInfo.word.toLowerCase().replace(/[^a-z]/g, '');
  
  // 拖动功能
  const wordHeader = layer.querySelector('.word-header');
  if (wordHeader && layerIndex === wordStack.length - 1) {
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
      initialLeft = rect.left + rect.width / 2; // transform translateX(-50%)
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
    layer.addEventListener('DOMNodeRemoved', () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    });
  }
  
  // Close button
  const closeBtn = layer.querySelector('#close-popup');
  const closeBtnAlt = layer.querySelector('#close-popup-btn');
  if (closeBtn) closeBtn.addEventListener('click', hidePopup);
  if (closeBtnAlt) closeBtnAlt.addEventListener('click', hidePopup);
  
  // Save button
  const saveBtn = layer.querySelector('#save-word');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveWord({ ...wordInfo.data, context: wordInfo.sentence || '' });
    });
  }
  
  // Copy word button and word text click
  const copyBtn = layer.querySelector('#copy-word-btn');
  const wordText = layer.querySelector('#word-text');
  
  const copyWord = () => {
    const word = wordInfo.word;
    navigator.clipboard.writeText(word).then(() => {
      // Show temporary feedback
      const originalText = copyBtn ? copyBtn.textContent : '';
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
      console.error('Copy failed:', err);
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
  
  // Star button for saving to vocabulary
  const starBtn = layer.querySelector('#star-btn');
  if (starBtn && typeof isWordSaved === 'function') {
    // Check if word is already saved
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
            // 更新savedWord并重新渲染
            wordInfo.savedWord = null;
            renderPopupStack();
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
            baseFormTranslation: wordInfo.data.baseFormTranslation,
            context: wordInfo.sentence || window.location.href
          };
          
          const result = await saveWord(wordData);
          if (result && result.success) {
            starBtn.classList.add('saved');
            starBtn.title = '取消收藏';
            showToast(result.isNew ? '✨ 已收藏到生词本' : '📝 已更新生词本');
            // 更新savedWord并重新渲染
            if (typeof getWord === 'function') {
              wordInfo.savedWord = await getWord(wordInfo.word);
              renderPopupStack();
            }
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
  
  if (wordText) {
    wordText.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyWord();
    });
  }
  
  // Translation toggle
  const translationToggle = layer.querySelector('#translation-toggle');
  const translationContent = layer.querySelector('#translation-content');
  const translationIcon = layer.querySelector('#translation-icon');
  
  if (translationToggle && translationContent && translationIcon) {
    translationToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isHidden = translationContent.style.display === 'none';
      translationContent.style.display = isHidden ? 'block' : 'none';
      translationIcon.textContent = isHidden ? '▲' : '▼';
    });
  }
  
  // Base form toggle
  const baseformToggle = layer.querySelector('#baseform-toggle');
  const baseformContent = layer.querySelector('#baseform-content');
  const baseformIcon = layer.querySelector('#baseform-icon');
  
  if (baseformToggle && baseformContent && baseformIcon) {
    baseformToggle.addEventListener('click', (e) => {
      e.preventDefault();
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
      
      if (!updateReviewInfo || typeof updateReviewInfo !== 'function') {
        showToast('复习功能暂不可用');
        return;
      }
      
      try {
        if (isChecked) {
          await updateReviewInfo(wordInfo.word);
          showToast('已标记为复习');
          // 更新当前层的savedWord并重新渲染
          if (typeof getWord === 'function') {
            wordInfo.savedWord = await getWord(wordInfo.word);
            renderPopupStack();
          }
        } else {
          // 重置reviewCount
          const VOCABULARY_KEY = 'vocabulary';
          const STORAGE = chrome.storage.local;
          const { vocabulary = [] } = await new Promise((resolve) => {
            STORAGE.get(VOCABULARY_KEY, resolve);
          });
          const wordIndex = vocabulary.findIndex(w => w.word === wordInfo.word);
          if (wordIndex >= 0) {
            vocabulary[wordIndex].reviewCount = 0;
            vocabulary[wordIndex].lastReviewed = null;
            await new Promise((resolve) => {
              STORAGE.set({ [VOCABULARY_KEY]: vocabulary }, resolve);
            });
            showToast('已取消复习标记');
            // 更新当前层的savedWord并重新渲染
            if (typeof getWord === 'function') {
              wordInfo.savedWord = await getWord(wordInfo.word);
              renderPopupStack();
            }
          }
        }
      } catch (error) {
        console.error('复习状态更新失败:', error);
        showToast('操作失败');
      }
    });
  }
  
  // Flag buttons for audio (full popup view)
  const usFlagBtn = layer.querySelector('#us-btn');
  if (usFlagBtn) {
    usFlagBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const audioUrl = `https://dict.youdao.com/dictvoice?type=0&audio=${cleanWord}`;
      new Audio(audioUrl).play().catch(err => console.error('Audio error:', err));
    });
  }
  
  const ukFlagBtn = layer.querySelector('#uk-btn');
  if (ukFlagBtn) {
    ukFlagBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const audioUrl = `https://dict.youdao.com/dictvoice?type=1&audio=${cleanWord}`;
      new Audio(audioUrl).play().catch(err => console.error('Audio error:', err));
    });
  }
  
  // Compact flag buttons (for old layers)
  const compactFlags = layer.querySelectorAll('.compact-flag');
  compactFlags.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const word = btn.getAttribute('data-word').toLowerCase().replace(/[^a-z]/g, '');
      const accent = btn.getAttribute('data-accent');
      const type = accent === 'us' ? 0 : 1;
      const audioUrl = `https://dict.youdao.com/dictvoice?type=${type}&audio=${word}`;
      new Audio(audioUrl).play().catch(err => console.error('Audio error:', err));
    });
  });
  
  // Copy word in compact view
  const compactCopyBtn = layer.querySelector('.compact-copy-btn');
  const compactWordText = layer.querySelector('.compact-word-text');
  
  const copyCompactWord = () => {
    const word = wordInfo.word;
    navigator.clipboard.writeText(word).then(() => {
      if (compactCopyBtn) {
        compactCopyBtn.textContent = '✓';
        compactCopyBtn.style.color = '#10b981';
      }
      if (compactWordText) {
        compactWordText.style.color = '#10b981';
      }
      
      setTimeout(() => {
        if (compactCopyBtn) {
          compactCopyBtn.textContent = '📋';
          compactCopyBtn.style.color = '';
        }
        if (compactWordText) {
          compactWordText.style.color = '';
        }
      }, 1000);
      
      showToast('已复制: ' + word);
    }).catch(err => {
      console.error('Copy failed:', err);
      showToast('复制失败');
    });
  };
  
  if (compactCopyBtn) {
    compactCopyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyCompactWord();
    });
  }
  
  if (compactWordText) {
    compactWordText.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyCompactWord();
    });
  }
  
  // Clickable word tags (synonyms/antonyms) - support nested lookup
  const wordTags = layer.querySelectorAll('.word-tag');
  wordTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const clickedWord = tag.textContent.trim();
      // 使用当前层的位置作为新查询的起点
      const rect = layer.getBoundingClientRect();
      lookupWord(clickedWord, {
        word: clickedWord,
        sentence: clickedWord,
        x: rect.left + rect.width / 2,
        y: rect.top + 60 // 在当前弹窗下方一点
      });
    });
  });
}

// Display error
function displayError(message) {
  if (!popupContainer) return;
  
  popupContainer.innerHTML = `
    <div class="popup-header">
      <div class="word-title">Error</div>
      <button class="close-btn" id="close-popup">×</button>
    </div>
    <div class="error">${message}</div>
    <div class="actions">
      <button class="btn btn-secondary" id="close-popup-btn">Close</button>
    </div>
  `;
  
  const closeBtn = shadowRoot.getElementById('close-popup');
  const closeBtnAlt = shadowRoot.getElementById('close-popup-btn');
  
  if (closeBtn) closeBtn.addEventListener('click', hidePopup);
  if (closeBtnAlt) closeBtnAlt.addEventListener('click', hidePopup);
}

// Lookup word via background script
async function lookupWord(word, context) {
  try {
    // Check if extension context is valid
    if (!chrome.runtime?.id) {
      console.error('Extension context invalid');
      return;
    }
    
    // Add new word to stack
    wordStack.push({
      word: word,
      x: context.x,
      y: context.y,
      loading: true,
      data: null,
      error: null
    });
    
    renderPopupStack();
    
    chrome.runtime.sendMessage(
      { type: 'LOOKUP_WORD', word },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          if (wordStack.length > 0) {
            wordStack[wordStack.length - 1].loading = false;
            wordStack[wordStack.length - 1].error = 'Connection error';
            renderPopupStack();
          }
          return;
        }
        
        if (!response) {
          if (wordStack.length > 0) {
            wordStack[wordStack.length - 1].loading = false;
            wordStack[wordStack.length - 1].error = 'No response';
            renderPopupStack();
          }
          return;
        }
        
        if (response.success) {
          // Update the last item in stack with data
          if (wordStack.length > 0) {
            // 获取收藏信息
            if (typeof getWord === 'function') {
              getWord(word).then(savedWord => {
                wordStack[wordStack.length - 1].loading = false;
                wordStack[wordStack.length - 1].data = response.data;
                wordStack[wordStack.length - 1].savedWord = savedWord;
                renderPopupStack();
              }).catch(err => {
                console.error('获取收藏信息失败:', err);
                wordStack[wordStack.length - 1].loading = false;
                wordStack[wordStack.length - 1].data = response.data;
                wordStack[wordStack.length - 1].savedWord = null;
                renderPopupStack();
              });
            } else {
              wordStack[wordStack.length - 1].loading = false;
              wordStack[wordStack.length - 1].data = response.data;
              wordStack[wordStack.length - 1].savedWord = null;
              renderPopupStack();
            }
          }
        } else {
          if (wordStack.length > 0) {
            wordStack[wordStack.length - 1].loading = false;
            wordStack[wordStack.length - 1].error = response.error || 'Word not found';
            renderPopupStack();
          }
        }
      }
    );
  } catch (error) {
    console.error('Lookup error:', error);
    if (wordStack.length > 0) {
      wordStack[wordStack.length - 1].loading = false;
      wordStack[wordStack.length - 1].error = 'Extension error';
      renderPopupStack();
    }
  }
}

// Handle text selection
let lastLookupWord = '';
let lastLookupTime = 0;

function handleSelection(event) {
  // Check if selection is inside shadow DOM
  const isInShadowDOM = event.target.closest('#linguacontext-shadow-host');
  
  // Get selection context
  let context;
  if (isInShadowDOM) {
    // Get selection from shadow DOM
    const shadowSelection = shadowRoot.getSelection ? shadowRoot.getSelection() : window.getSelection();
    if (!shadowSelection || !shadowSelection.rangeCount) return;
    
    const selectedText = shadowSelection.toString().trim();
    if (!selectedText) return;
    
    const range = shadowSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    context = {
      word: selectedText,
      sentence: selectedText,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    };
  } else {
    // Get selection from main page
    context = getSelectionContext();
  }
  
  if (!context) {
    return;
  }
  
  // Only process English text (letters, hyphens, apostrophes)
  const englishPattern = /^[a-zA-Z\s\-']+$/;
  if (!englishPattern.test(context.word)) {
    return;
  }
  
  // Filter out single letters
  if (context.word.length === 1) {
    return;
  }
  
  // Only process single words (no spaces)
  if (context.word.includes(' ')) {
    return;
  }
  
  // Prevent duplicate lookups in quick succession (for double-click)
  const now = Date.now();
  if (context.word.toLowerCase() === lastLookupWord.toLowerCase() && now - lastLookupTime < 300) {
    return;
  }
  lastLookupWord = context.word;
  lastLookupTime = now;
  currentSelection = context;
  
  // Delay lookup slightly to avoid triggering on drag selections
  setTimeout(() => {
    if (currentSelection && currentSelection.word === context.word) {
      lookupWord(context.word, context);
    }
  }, 200);
}

// Listen for context menu lookup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'CONTEXT_MENU_LOOKUP') {
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    
    if (range) {
      const rect = range.getBoundingClientRect();
      lookupWord(request.word, {
        word: request.word,
        sentence: request.word,
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY + 8
      });
    }
  }
});

// Check extension validity on load
function checkExtensionValidity() {
  if (!chrome.runtime?.id) {
    console.warn('4R Vocabulary Direct: Extension context invalidated. Content script needs page refresh.');
    return false;
  }
  return true;
}

// Initialize
if (checkExtensionValidity()) {
  initializeShadowDOM();
  
  // Event listeners
  document.addEventListener('mouseup', handleSelection);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hidePopup();
    }
  });
  
  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#linguacontext-shadow-host') && popupContainer && !popupContainer.classList.contains('hidden')) {
      hidePopup();
    }
  });
  
  console.log('4R Vocabulary Direct: Ready to lookup words!');
} else {
  console.error('4R Vocabulary Direct: Failed to initialize. Please refresh the page.');
}

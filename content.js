// Content Script: Captures words and sentences, displays results using Shadow DOM
(function() {
  'use strict';

  let shadowHost = null;
  let shadowRoot = null;
  let selectedWord = '';
  let contextSentence = '';

  // Initialize Shadow DOM
  function initShadowDOM() {
    if (shadowHost) return;

    shadowHost = document.createElement('div');
    shadowHost.id = '4r-vocab-extension-shadow-host';
    shadowHost.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;';
    document.body.appendChild(shadowHost);

    shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
    
    // Inject styles into Shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      .vocab-popup {
        position: fixed;
        background: white;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #333;
        z-index: 10000;
        display: none;
      }
      .vocab-popup.visible {
        display: block;
      }
      .vocab-popup-header {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 8px;
        color: #1a73e8;
      }
      .vocab-popup-context {
        margin: 8px 0;
        padding: 8px;
        background: #f5f5f5;
        border-radius: 4px;
        font-style: italic;
        color: #555;
      }
      .vocab-popup-translation {
        margin: 8px 0;
        padding: 8px;
        background: #e8f0fe;
        border-radius: 4px;
      }
      .vocab-popup-loading {
        color: #666;
        font-style: italic;
      }
      .vocab-popup-close {
        position: absolute;
        top: 8px;
        right: 8px;
        cursor: pointer;
        font-size: 20px;
        color: #666;
        background: none;
        border: none;
        padding: 0;
        width: 24px;
        height: 24px;
        line-height: 24px;
        text-align: center;
      }
      .vocab-popup-close:hover {
        color: #333;
      }
    `;
    shadowRoot.appendChild(style);

    // Create popup container
    const popup = document.createElement('div');
    popup.className = 'vocab-popup';
    popup.innerHTML = `
      <button class="vocab-popup-close">×</button>
      <div class="vocab-popup-header"></div>
      <div class="vocab-popup-context"></div>
      <div class="vocab-popup-translation"></div>
    `;
    shadowRoot.appendChild(popup);

    // Add close button handler
    const closeBtn = shadowRoot.querySelector('.vocab-popup-close');
    closeBtn.addEventListener('click', hidePopup);
  }

  // Extract sentence context around selected text
  function getContextSentence(selection) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const textNode = container.nodeType === Node.TEXT_NODE ? container : container.firstChild;
    
    if (!textNode || !textNode.textContent) {
      return '';
    }

    const fullText = textNode.textContent;
    const selectedText = selection.toString();
    const startIndex = fullText.indexOf(selectedText);
    
    if (startIndex === -1) {
      return fullText.trim();
    }

    // Find sentence boundaries (., !, ?)
    let sentenceStart = fullText.lastIndexOf('.', startIndex);
    if (sentenceStart === -1) sentenceStart = fullText.lastIndexOf('!', startIndex);
    if (sentenceStart === -1) sentenceStart = fullText.lastIndexOf('?', startIndex);
    if (sentenceStart === -1) sentenceStart = 0;
    else sentenceStart += 1;

    let sentenceEnd = fullText.indexOf('.', startIndex + selectedText.length);
    if (sentenceEnd === -1) sentenceEnd = fullText.indexOf('!', startIndex + selectedText.length);
    if (sentenceEnd === -1) sentenceEnd = fullText.indexOf('?', startIndex + selectedText.length);
    if (sentenceEnd === -1) sentenceEnd = fullText.length;
    else sentenceEnd += 1;

    return fullText.substring(sentenceStart, sentenceEnd).trim();
  }

  // Show popup with translation
  function showPopup(x, y, word, context, translation) {
    if (!shadowRoot) return;

    const popup = shadowRoot.querySelector('.vocab-popup');
    const header = shadowRoot.querySelector('.vocab-popup-header');
    const contextDiv = shadowRoot.querySelector('.vocab-popup-context');
    const translationDiv = shadowRoot.querySelector('.vocab-popup-translation');

    header.textContent = word;
    contextDiv.innerHTML = `<strong>Context:</strong> ${context}`;
    translationDiv.innerHTML = translation;

    // Position popup near selection
    popup.style.left = `${x}px`;
    popup.style.top = `${y + 20}px`;
    popup.classList.add('visible');

    // Adjust position if popup goes off screen
    setTimeout(() => {
      const rect = popup.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        popup.style.left = `${window.innerWidth - rect.width - 10}px`;
      }
      if (rect.bottom > window.innerHeight) {
        popup.style.top = `${y - rect.height - 10}px`;
      }
    }, 0);
  }

  // Hide popup
  function hidePopup() {
    if (!shadowRoot) return;
    const popup = shadowRoot.querySelector('.vocab-popup');
    popup.classList.remove('visible');
  }

  // Handle text selection
  function handleSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    // Only process if text is selected and is a single word or short phrase
    if (!text || text.length === 0 || text.length > 50) {
      hidePopup();
      return;
    }

    // Check if it's likely an English word/phrase
    if (!/^[a-zA-Z\s'-]+$/.test(text)) {
      return;
    }

    selectedWord = text;
    contextSentence = getContextSentence(selection);

    // Get selection position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Show loading state
    showPopup(rect.left, rect.bottom, selectedWord, contextSentence, '<span class="vocab-popup-loading">Loading translation...</span>');

    // Send message to background script for translation
    chrome.runtime.sendMessage({
      type: 'LOOKUP_WORD',
      word: selectedWord,
      context: contextSentence
    }, (response) => {
      if (response && response.success) {
        showPopup(rect.left, rect.bottom, selectedWord, contextSentence, response.translation);
      } else {
        showPopup(rect.left, rect.bottom, selectedWord, contextSentence, '<span style="color: red;">Translation failed. Please try again.</span>');
      }
    });
  }

  // Initialize
  initShadowDOM();

  // Listen for text selection
  document.addEventListener('mouseup', (e) => {
    // Small delay to ensure selection is complete
    setTimeout(handleSelection, 10);
  });

  // Hide popup when clicking outside
  document.addEventListener('mousedown', (e) => {
    if (shadowHost && !shadowHost.contains(e.target)) {
      hidePopup();
    }
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TRANSLATION_UPDATE') {
      // Handle any updates from background if needed
      sendResponse({ received: true });
    }
    return true;
  });

})();

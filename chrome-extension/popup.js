// popup.js - Extension Popup UI Logic
console.log('LinguaContext Popup Loaded');

const statsEl = document.getElementById('stats');
const wordListEl = document.getElementById('word-list');
const exportBtn = document.getElementById('export-btn');
const clearBtn = document.getElementById('clear-btn');

// Load saved words
async function loadWords() {
  chrome.runtime.sendMessage(
    { type: 'GET_SAVED_WORDS' },
    (response) => {
      if (response.success) {
        displayWords(response.words);
      }
    }
  );
}

// Display words in list
function displayWords(words) {
  if (!words || words.length === 0) {
    statsEl.textContent = 'No words saved yet';
    wordListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📖</div>
        <div>No words saved yet</div>
        <div style="font-size: 12px; margin-top: 8px;">
          Select any word on a webpage to get started!
        </div>
      </div>
    `;
    return;
  }
  
  statsEl.textContent = `${words.length} word${words.length !== 1 ? 's' : ''} saved`;
  
  wordListEl.innerHTML = words.map(word => `
    <div class="word-item" data-word="${word.word}">
      <div class="word-name">${word.word}</div>
      <div class="word-def">${word.definition || word.translation || 'No definition'}</div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.word-item').forEach(item => {
    item.addEventListener('click', () => {
      const word = item.getAttribute('data-word');
      // Could open a detailed view or search for the word
      console.log('Clicked word:', word);
    });
  });
}

// Export words to JSON
function exportWords() {
  chrome.runtime.sendMessage(
    { type: 'GET_SAVED_WORDS' },
    (response) => {
      if (response.success && response.words.length > 0) {
        const dataStr = JSON.stringify(response.words, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `linguacontext-words-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        alert('No words to export');
      }
    }
  );
}

// Clear all words
function clearAllWords() {
  if (confirm('Are you sure you want to delete all saved words? This cannot be undone.')) {
    chrome.storage.local.set({ words: [] }, () => {
      loadWords();
    });
  }
}

// Event listeners
exportBtn.addEventListener('click', exportWords);
clearBtn.addEventListener('click', clearAllWords);

// Initial load
loadWords();

/**
 * Popup.js - 扩展弹出窗口
 */

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatistics();
  setupEventListeners();
});

/**
 * 加载统计信息
 */
async function loadStatistics() {
  try {
    const { vocabulary = [] } = await chrome.storage.sync.get('vocabulary');
    
    const totalCount = vocabulary.length;
    const reviewedCount = vocabulary.filter(w => w.reviewCount > 0).length;
    
    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('reviewed-count').textContent = reviewedCount;
  } catch (error) {
    console.error('加载统计信息失败:', error);
  }
}

/**
 * 设置事件监听
 */
function setupEventListeners() {
  // 打开生词本按钮
  document.getElementById('open-list-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('vocabulary-list.html') });
  });
  
  // 设置按钮（暂时也打开生词本）
  document.getElementById('options-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('vocabulary-list.html') });
  });
}

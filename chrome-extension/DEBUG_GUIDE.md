# 收藏功能调试指南

## 测试步骤

### 1. 重新加载扩展
1. 打开 `chrome://extensions/`
2. 找到 "4R Vocabulary Direct" 扩展
3. 点击刷新图标 🔄

### 2. 打开控制台
1. 在任意网页上按 F12 打开开发者工具
2. 切换到 Console 标签
3. 应该看到：`📚 Vocabulary Manager 已加载`

### 3. 测试收藏功能
1. 在网页上选中一个英文单词（例如：example）
2. 单词卡片弹出后，查看右上角的 ⭐ 按钮
3. 点击 ⭐ 按钮
4. 观察控制台输出，应该看到：
   ```
   ⭐ 收藏按钮被点击
   当前状态: 未收藏
   执行收藏...
   保存单词数据: {word: "example", ...}
   📝 saveWord 被调用: example
   当前生词本有 X 个单词
   ✅ 单词已保存到 Chrome Storage
   🔢 徽章已更新: X
   收藏结果: {success: true, isNew: true}
   ```
5. 应该弹出 alert 提示："✨ 已收藏到生词本"

### 4. 验证数据保存
1. 打开 `chrome://extensions/`
2. 在扩展卡片上点击 "详情"
3. 滚动到底部，点击 "检查视图: Service Worker"
4. 在弹出的控制台中输入：
   ```javascript
   chrome.storage.sync.get('vocabulary', (result) => {
     console.log('生词本数据:', result.vocabulary);
   });
   ```
5. 应该看到已保存的单词数据

### 5. 查看生词本
1. 点击浏览器工具栏的扩展图标
2. 点击 "📖 打开生词本"
3. 应该看到刚才收藏的单词

## 常见问题排查

### 问题1: 点击⭐没反应
**检查项**：
- [ ] 控制台是否显示 `📚 Vocabulary Manager 已加载`
- [ ] 点击时控制台是否有 `⭐ 收藏按钮被点击`
- [ ] 是否有任何错误信息

**解决方法**：
- 完全卸载并重新安装扩展
- 清除浏览器缓存后重试

### 问题2: 显示"生词本功能加载中"
**原因**：vocabulary-manager.js 未正确加载

**检查项**：
- [ ] manifest.json 中 content_scripts 是否包含 vocabulary-manager.js
- [ ] 文件路径是否正确

**解决方法**：
```bash
cd chrome-extension
ls -la vocabulary-manager.js  # 确认文件存在
```

### 问题3: 提示"操作失败"
**检查项**：
- [ ] 控制台中的具体错误信息
- [ ] Chrome Storage 权限是否正常

**解决方法**：
在控制台测试 Chrome Storage：
```javascript
chrome.storage.sync.set({test: 'hello'}, () => {
  console.log('写入测试:', chrome.runtime.lastError);
  chrome.storage.sync.get('test', (result) => {
    console.log('读取测试:', result.test);
  });
});
```

### 问题4: 徽章数字不更新
**原因**：扩展图标 badge 更新失败

**检查项**：
- [ ] Service Worker 是否正常运行
- [ ] 控制台是否有 `🔢 徽章已更新` 日志

**解决方法**：
手动更新徽章测试：
```javascript
chrome.action.setBadgeText({text: '5'});
chrome.action.setBadgeBackgroundColor({color: '#8b5cf6'});
```

## 详细日志说明

成功收藏的完整日志流程：
```
1. 📚 Vocabulary Manager 已加载          // vocabulary-manager.js 加载
2. ⭐ 收藏按钮被点击                     // 用户点击
3. 当前状态: 未收藏                      // 检查收藏状态
4. 执行收藏...                          // 开始保存
5. 保存单词数据: {...}                   // 显示要保存的数据
6. 📝 saveWord 被调用: example          // 进入 saveWord 函数
7. 当前生词本有 0 个单词                 // 读取现有数据
8. ✅ 单词已保存到 Chrome Storage       // 写入成功
9. 🔢 徽章已更新: 1                     // 更新徽章
10. 收藏结果: {success: true, ...}      // 返回结果
11. [Alert] ✨ 已收藏到生词本            // 用户提示
```

## 如果所有都正常但仍无提示

尝试以下测试代码（在控制台直接运行）：
```javascript
// 测试 alert
alert('测试 alert 是否工作');

// 测试 showToast（如果在页面上下文中）
if (typeof showToast === 'function') {
  showToast('测试 Toast');
}

// 手动测试保存
if (typeof saveWord === 'function') {
  saveWord({
    word: 'test',
    translation: '测试',
    addedAt: new Date().toISOString()
  }).then(result => {
    console.log('手动测试结果:', result);
    alert('手动测试: ' + JSON.stringify(result));
  });
}
```

## 联系支持

如果以上步骤都无法解决问题，请提供：
1. 完整的控制台日志截图
2. Chrome 版本号
3. 操作系统版本
4. 扩展版本号

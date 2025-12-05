# 生词本功能使用指南

## ✨ 功能特性

### 已实现功能（方案A）
✅ **本地收藏** - Chrome Storage Sync 自动云同步  
✅ **收藏按钮** - 单词卡片上的⭐按钮，点击收藏/取消收藏  
✅ **生词本管理** - 搜索、筛选、排序、删除  
✅ **数据导出** - 支持CSV和JSON格式导出  
✅ **统计信息** - 总词数、复习次数等统计  
✅ **徽章显示** - 扩展图标显示生词数量  

### 预留功能（飞书集成）
🔄 **飞书多维表格同步** - 配置后可启用  
🔄 **云端备份** - 飞书自动备份  
🔄 **多设备同步** - 通过飞书实现跨设备同步  

---

## 📖 使用方法

### 1. 收藏单词
1. 在任意网页上选中英文单词
2. 弹出的单词卡片中，点击⭐按钮
3. 收藏成功后，⭐变为★，显示"已收藏到生词本"

### 2. 查看生词本
- **方式1**: 点击浏览器工具栏的扩展图标 → 点击"打开生词本"
- **方式2**: 右键点击扩展图标 → 选择"选项" → 打开生词本

### 3. 生词本功能

#### 搜索与筛选
- **搜索框**: 输入单词、中文释义或定义进行搜索
- **标签筛选**: 按考试类型筛选（CET4/CET6/考研/IELTS等）
- **排序**: 支持按添加时间、字母、复习次数排序

#### 单词卡片操作
- **👁️ 复习**: 标记该单词为已复习，增加复习次数
- **🗑️ 删除**: 从生词本中移除该单词

#### 数据管理
- **导出CSV**: 可导入Excel或飞书多维表格
- **导出JSON**: 完整数据备份
- **导入JSON**: 恢复备份或合并数据
- **清空生词本**: 一键清空所有单词（需确认）

---

## 🚀 飞书多维表格集成（可选）

### 第一步：创建飞书多维表格

1. 登录飞书，创建一个新的多维表格
2. 建议的字段结构：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 单词 | 文本 | 主键 |
| 音标 | 文本 | 美式/英式音标 |
| 中文释义 | 文本 | 翻译 |
| 英文定义 | 文本 | 定义 |
| 例句 | 文本 | 多行文本 |
| 标签 | 多选 | CET4/CET6等 |
| 添加时间 | 日期时间 | 自动填充 |
| 复习次数 | 数字 | 默认0 |
| 来源 | 文本 | 网页URL |

### 第二步：配置飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 开通权限：
   - `bitable:app` - 多维表格读写
   - `bitable:app:readonly` - 多维表格只读
4. 获取凭证：
   - **App ID** 
   - **App Secret**

### 第三步：获取表格信息

1. 打开你创建的多维表格
2. 从浏览器地址栏获取：
   - **App Token**: URL中 `base/[这部分]`
   - **Table ID**: 点击具体数据表，URL最后的ID

示例URL:
```
https://xxx.feishu.cn/base/bascnCMII2ORej2RItqpZZUNMIe?table=tblxxx...
                            ↑ App Token ↑              ↑ Table ID ↑
```

### 第四步：配置扩展

1. 打开 `chrome-extension/feishu-config.js`
2. 填入配置信息：

```javascript
const FEISHU_CONFIG = {
  enabled: true,  // 启用飞书同步
  
  appId: 'cli_xxx...',           // 你的App ID
  appSecret: 'xxx...',           // 你的App Secret
  
  appToken: 'bascnCMII2ORej...', // 多维表格App Token
  tableId: 'tblxxx...',          // 数据表ID
  
  apiEndpoint: 'https://open.feishu.cn/open-apis'
};
```

3. 重新加载扩展
4. 收藏新单词时会自动同步到飞书

### 第五步：测试同步

收藏一个单词，查看：
1. 本地生词本是否正常显示
2. 飞书多维表格是否出现新记录
3. 浏览器控制台是否有错误信息

---

## 📊 数据格式

### Chrome Storage 数据结构
```javascript
{
  word: "example",
  phonetic: "/ɪɡˈzæmpəl/",
  phoneticUs: "/ɪɡˈzæmpəl/",
  phoneticUk: "/ɪɡˈzɑːmpəl/",
  translation: "例子；榜样",
  definition: "a thing characteristic of its kind",
  allDefinitions: [{
    definition: "...",
    synonyms: ["sample", "instance"]
  }],
  examples: [{
    sentence: "This is an example sentence.",
    source: "BBC",
    type: "auth"
  }],
  tags: ["CET4", "高中"],
  synonyms: ["sample", "instance"],
  baseForm: "",
  baseFormTranslation: "",
  addedAt: "2025-12-05T10:30:00.000Z",
  reviewCount: 0,
  lastReviewed: null,
  context: "https://example.com/page"
}
```

### CSV 导出格式
```csv
单词,美式音标,英式音标,中文释义,英文定义,例句,标签,添加时间,复习次数
example,/ɪɡˈzæmpəl/,/ɪɡˈzɑːmpəl/,例子；榜样,"a thing...",This is...,CET4, 高中,2025/12/5,0
```

---

## ⚠️ 注意事项

### Chrome Storage 限制
- **单项大小**: 最大100KB
- **总容量**: 最大100KB（sync）/ 10MB（local）
- **写入频率**: 每分钟最多120次

### 飞书API限制
- **QPS限制**: 每秒最多10次请求
- **Access Token**: 有效期2小时
- **批量同步**: 建议添加延迟避免限流

### 数据安全
- Chrome Storage Sync 自动加密同步
- 飞书数据存储在飞书云端
- 建议定期导出JSON备份

---

## 🐛 故障排查

### 收藏按钮不显示
1. 检查扩展是否已加载
2. 刷新页面重试
3. 查看浏览器控制台错误

### 飞书同步失败
1. 检查 `feishu-config.js` 配置是否正确
2. 确认飞书应用权限已开通
3. 查看控制台错误信息
4. 验证 App Token 和 Table ID 是否正确

### 生词本不显示
1. 检查 Chrome Storage 是否有数据：
   - 打开开发者工具 → Application → Storage → Extension
2. 尝试导入之前导出的JSON备份

---

## 🔮 后续计划

- [ ] 间隔重复算法（Spaced Repetition）
- [ ] 单词卡片学习模式
- [ ] 发音功能集成
- [ ] 上下文例句收集
- [ ] Anki 导出格式支持
- [ ] 飞书双向同步（从飞书拉取到本地）

---

## 📝 更新日志

### v1.0.0 (2025-12-05)
- ✅ 实现基础收藏功能
- ✅ 生词本管理界面
- ✅ CSV/JSON 导出导入
- ✅ 预留飞书API接口

---

有问题或建议？欢迎在 GitHub 提 Issue！

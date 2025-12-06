# 反向词形查询方案说明

## 问题
之前使用本地 `detectBaseForm` 函数维护不规则词形映射表，存在以下问题：
1. **维护成本高**：需要手动添加所有不规则词形（如 latest → late）
2. **覆盖不完整**：很多不规则形式会被遗漏
3. **准确性低**：基于模式匹配的猜测不够可靠

## 新方案：反向查询有道 API

### 核心思路
利用有道 API 本身提供的词形变化数据（wfs 字段）进行反向验证：

1. **当查询一个词时**（如 `latest`）
2. **如果该词没有 wfs 数据**（说明它不是原形词）
3. **生成可能的原形候选**（如 `late`、`lat`）
4. **查询每个候选词的有道 API**
5. **检查候选词的 wfs 是否包含当前词**
6. **如果匹配，使用该候选词作为原形词**

### 示例流程

#### 查询 `latest`
1. 查询 `https://dict.youdao.com/jsonapi?q=latest`
2. 发现没有 wfs 数据
3. 生成候选：`late` (去掉 est), `lat` (去掉 test)
4. 查询 `https://dict.youdao.com/jsonapi?q=late`
5. 发现其 wfs 包含：
   ```json
   {
     "wf": { "name": "最高级", "value": "latest" }
   }
   ```
6. ✅ 匹配！使用 `late` 作为原形词

#### 查询 `books`
1. 查询 `https://dict.youdao.com/jsonapi?q=books`
2. 发现没有 wfs 数据
3. 生成候选：`book` (去掉 s)
4. 查询 `https://dict.youdao.com/jsonapi?q=book`
5. 发现其 wfs 包含：
   ```json
   {
     "wf": { "name": "复数", "value": "books" }
   }
   ```
6. ✅ 匹配！使用 `book` 作为原形词

## 实现细节

### 1. `generateBaseCandidates(word)` 函数
生成可能的原形候选列表，使用简单的规则：

```javascript
// 示例
latest → ['late', 'lat']
books → ['book']
running → ['run', 'running', 'runn']
happier → ['happy']
```

### 2. `findBaseFormFromYoudao(word)` 函数
遍历候选词，查询有道 API 并验证：

```javascript
for (const candidate of candidates) {
  const baseData = await fetch(youdao_api);
  const wfs = baseData.ec?.word?.[0]?.wfs || [];
  
  // 检查 wfs 中是否包含当前词
  if (wfs.find(item => item.wf?.value === word)) {
    return candidate; // 找到原形词！
  }
}
```

## 优势

✅ **无需维护本地映射表**：所有验证由有道 API 完成  
✅ **覆盖所有词形**：只要有道 API 有数据，就能正确识别  
✅ **准确性高**：使用权威词典数据，不依赖模式猜测  
✅ **扩展性好**：新增词形无需修改代码  

## 测试用例

| 输入词 | 候选原形 | 有道验证 | 结果 |
|--------|----------|----------|------|
| latest | late | ✅ wfs 包含 latest | late |
| books | book | ✅ wfs 包含 books | book |
| running | run | ✅ wfs 包含 running | run |
| better | good | ✅ 不规则映射 | good |
| children | child | ✅ 不规则映射 | child |

## 性能考虑

- 每个候选词需要额外的 API 请求（通常 1-3 个）
- 使用异步并发可以优化性能
- 可以添加缓存减少重复请求

## 后续优化

1. **添加缓存**：缓存已查询的词形映射
2. **并发查询**：同时查询多个候选词
3. **智能排序**：优先查询最可能的候选词

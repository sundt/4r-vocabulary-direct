# 词典数据说明

## 当前实现

项目现已集成 **ECDICT** (Easy & Compact Dictionary) 英汉词典服务。

### 特点

1. **完全离线**：无需网络请求即可查询常用词汇
2. **中英双语**：同时提供英文定义和中文翻译
3. **词汇等级**：标注词汇难度（中考、高考、四六级等）
4. **柯林斯星级**：显示词汇重要程度（1-5星）
5. **牛津3000**：标记是否为牛津核心词汇

### 查询优先级

1. **ECDICT** - 最快，包含中文翻译和词汇等级
2. **本地词典** - 备用方案
3. **Free Dictionary API** - 在线查询

## 扩展词典数据

### 方法1：添加更多词条到 commonWords

编辑 `services/ecdictService.ts`，在 `commonWords` 对象中添加：

```typescript
"example": {
  word: "example",
  phonetic: "ɪɡˈzɑːmpl",
  definition: "a thing characteristic of its kind",
  translation: "例子；榜样；实例",
  pos: "n.",
  collins: 5,
  oxford: true,
  tag: "zk gk cet4"
}
```

### 方法2：从 CSV 文件加载

下载完整 ECDICT 数据：
- GitHub: https://github.com/skywind3000/ECDICT
- 约 77 万词条，压缩后 ~8MB

```typescript
// 示例：从 CSV 加载
import Papa from 'papaparse';

export const loadDictionaryFromCSV = async (csvPath: string) => {
  const response = await fetch(csvPath);
  const csv = await response.text();
  
  Papa.parse(csv, {
    header: true,
    complete: (results) => {
      // 处理数据
      results.data.forEach(row => {
        commonWords[row.word] = {
          word: row.word,
          phonetic: row.phonetic,
          definition: row.definition,
          translation: row.translation,
          pos: row.pos,
          // ...
        };
      });
    }
  });
};
```

### 方法3：使用 IndexedDB 存储大量词条

对于完整的 77 万词条，建议使用浏览器的 IndexedDB：

```typescript
import { openDB } from 'idb';

const db = await openDB('ecdict', 1, {
  upgrade(db) {
    db.createObjectStore('words', { keyPath: 'word' });
  }
});

// 查询
const word = await db.get('words', 'example');
```

### 方法4：集成其他开源词典

#### GoldenDict 格式
- 支持 Stardict、DSL、Babylon 等格式
- 需要解析工具

#### Mdict 格式
- 常用于移动端词典
- npm 包：`mdict-parser`

#### Anki 词库
- 可以导出为 JSON 格式
- 适合学习场景

## 词汇等级标签

- `zk` - 中考
- `gk` - 高考  
- `cet4` - 大学英语四级
- `cet6` - 大学英语六级
- `ky` - 考研
- `ielts` - 雅思
- `toefl` - 托福
- `gre` - GRE

## 柯林斯星级

- ★ - 较少使用
- ★★ - 一般
- ★★★ - 常用
- ★★★★ - 高频
- ★★★★★ - 最常用

## 推荐方案

对于生产环境，建议：

1. **核心词汇**（~5000词）：内置在代码中（当前实现）
2. **扩展词汇**（~20000词）：按需加载 JSON 文件
3. **完整词典**（~77万词）：IndexedDB + 分片加载

这样可以平衡性能和功能。

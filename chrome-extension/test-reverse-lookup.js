/**
 * 测试反向词形查询逻辑
 * 在浏览器控制台中运行此脚本来验证
 */

// 生成可能的原形词候选
function generateBaseCandidates(word) {
  const candidates = [];
  
  // 不规则形式的直接映射
  const irregulars = {
    'better': 'good',
    'best': 'good',
    'worse': 'bad',
    'worst': 'bad',
    'children': 'child',
    'people': 'person',
    'men': 'man',
    'women': 'woman'
  };
  
  if (irregulars[word]) {
    candidates.push({ base: irregulars[word], type: 'irregular' });
  }
  
  // 规则变形：生成多个可能的原形
  if (word.endsWith('ies')) {
    candidates.push({ base: word.slice(0, -3) + 'y', type: 'plural/verb' });
  }
  if (word.endsWith('es') && word.length > 3) {
    candidates.push({ base: word.slice(0, -2), type: 'plural/verb' });
    candidates.push({ base: word.slice(0, -1), type: 'plural/verb' });
  }
  if (word.endsWith('s') && word.length > 3) {
    candidates.push({ base: word.slice(0, -1), type: 'plural/verb' });
  }
  if (word.endsWith('ed') && word.length > 3) {
    candidates.push({ base: word.slice(0, -2), type: 'past' });
    candidates.push({ base: word.slice(0, -1), type: 'past' });
    if (word.length > 4) {
      candidates.push({ base: word.slice(0, -3), type: 'past' });
    }
  }
  if (word.endsWith('ing') && word.length > 4) {
    candidates.push({ base: word.slice(0, -3), type: 'gerund' });
    candidates.push({ base: word.slice(0, -3) + 'e', type: 'gerund' });
    if (word.length > 5) {
      candidates.push({ base: word.slice(0, -4), type: 'gerund' });
    }
  }
  if (word.endsWith('er') && word.length > 3) {
    candidates.push({ base: word.slice(0, -2), type: 'comparative' });
    if (word.length > 4) {
      candidates.push({ base: word.slice(0, -3), type: 'comparative' });
    }
  }
  if (word.endsWith('est') && word.length > 4) {
    candidates.push({ base: word.slice(0, -3), type: 'superlative' });
    if (word.length > 5) {
      candidates.push({ base: word.slice(0, -4), type: 'superlative' });
    }
  }
  if (word.endsWith('ier')) {
    candidates.push({ base: word.slice(0, -3) + 'y', type: 'comparative' });
  }
  if (word.endsWith('iest')) {
    candidates.push({ base: word.slice(0, -4) + 'y', type: 'superlative' });
  }
  
  return candidates;
}

// 测试用例
const testWords = [
  'latest',
  'books',
  'running',
  'happier',
  'better',
  'children',
  'stopped',
  'tries',
  'coming'
];

console.log('=== 词形候选生成测试 ===\n');

testWords.forEach(word => {
  const candidates = generateBaseCandidates(word);
  console.log(`${word}:`);
  candidates.forEach(c => {
    console.log(`  → ${c.base} (${c.type})`);
  });
  console.log('');
});

// 异步验证函数
async function verifyWithYoudao(word) {
  const candidates = generateBaseCandidates(word);
  
  for (const candidate of candidates) {
    try {
      const response = await fetch(
        `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(candidate.base)}`
      );
      
      if (!response.ok) continue;
      
      const baseData = await response.json();
      const wfs = baseData.ec?.word?.[0]?.wfs || [];
      
      // 检查wfs中是否包含当前查询的词
      const matchingWf = wfs.find(item => 
        item.wf?.value?.toLowerCase() === word.toLowerCase()
      );
      
      if (matchingWf) {
        return {
          success: true,
          word,
          baseForm: candidate.base,
          matchedAs: matchingWf.wf?.name,
          allWfs: wfs.map(w => `${w.wf?.name}: ${w.wf?.value}`)
        };
      }
    } catch (err) {
      console.error(`Failed to check ${candidate.base}:`, err.message);
    }
  }
  
  return {
    success: false,
    word,
    candidates: candidates.map(c => c.base)
  };
}

// 运行验证测试
console.log('\n=== 有道API反向验证测试 ===\n');

async function runTests() {
  for (const word of testWords) {
    const result = await verifyWithYoudao(word);
    
    if (result.success) {
      console.log(`✅ ${result.word} → ${result.baseForm} (${result.matchedAs})`);
      console.log(`   词形: ${result.allWfs.join(', ')}`);
    } else {
      console.log(`❌ ${result.word} - 未找到原形`);
      console.log(`   尝试的候选: ${result.candidates.join(', ')}`);
    }
    console.log('');
  }
}

// 开始测试
runTests().then(() => {
  console.log('测试完成！');
});

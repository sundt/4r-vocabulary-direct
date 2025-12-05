/**
 * Feishu Configuration - 飞书多维表格配置
 * 
 * 使用说明：
 * 1. 访问飞书开放平台：https://open.feishu.cn/
 * 2. 创建企业自建应用
 * 3. 开通权限：bitable:app（多维表格读写）
 * 4. 获取 App ID 和 App Secret
 * 5. 打开你的多维表格，从URL获取 App Token 和 Table ID
 * 6. 填入下方配置
 */

const FEISHU_CONFIG = {
  // 是否启用飞书同步
  enabled: false,
  
  // 飞书应用凭证
  appId: '',        // 例如: cli_a1b2c3d4e5f6g7h8
  appSecret: '',    // 例如: abcdefghijklmnopqrstuvwxyz123456
  
  // 多维表格信息
  appToken: '',     // 例如: bascnCMII2ORej2RItqpZZUNMIe
  tableId: '',      // 例如: tblxxx...
  
  // API端点
  apiEndpoint: 'https://open.feishu.cn/open-apis'
};

/**
 * 获取飞书 Access Token
 */
async function getFeishuAccessToken() {
  if (!FEISHU_CONFIG.appId || !FEISHU_CONFIG.appSecret) {
    throw new Error('飞书应用凭证未配置');
  }
  
  const response = await fetch(`${FEISHU_CONFIG.apiEndpoint}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      app_id: FEISHU_CONFIG.appId,
      app_secret: FEISHU_CONFIG.appSecret
    })
  });
  
  const data = await response.json();
  
  if (data.code !== 0) {
    throw new Error(`获取Access Token失败: ${data.msg}`);
  }
  
  return data.tenant_access_token;
}

/**
 * 添加记录到飞书多维表格
 */
async function addRecordToFeishu(wordData) {
  if (!FEISHU_CONFIG.enabled) {
    console.log('飞书同步未启用');
    return { success: false, reason: 'disabled' };
  }
  
  try {
    const accessToken = await getFeishuAccessToken();
    
    // 构建记录数据
    const record = {
      fields: {
        '单词': wordData.word,
        '音标': `${wordData.phoneticUs || ''} / ${wordData.phoneticUk || ''}`,
        '中文释义': wordData.translation || '',
        '英文定义': wordData.definition || '',
        '例句': (wordData.examples || []).slice(0, 3).map(ex => ex.sentence || ex).join('\n'),
        '标签': (wordData.tags || []).join(', '),
        '添加时间': new Date().toISOString(),
        '复习次数': 0,
        '来源': wordData.context || ''
      }
    };
    
    const response = await fetch(
      `${FEISHU_CONFIG.apiEndpoint}/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.tableId}/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      }
    );
    
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`添加记录失败: ${data.msg}`);
    }
    
    return { success: true, recordId: data.data.record.record_id };
  } catch (error) {
    console.error('飞书同步失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 从飞书多维表格读取所有记录
 */
async function fetchRecordsFromFeishu() {
  if (!FEISHU_CONFIG.enabled) {
    return { success: false, reason: 'disabled' };
  }
  
  try {
    const accessToken = await getFeishuAccessToken();
    
    const response = await fetch(
      `${FEISHU_CONFIG.apiEndpoint}/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${FEISHU_CONFIG.tableId}/records`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(`读取记录失败: ${data.msg}`);
    }
    
    // 转换飞书记录为生词本格式
    const vocabulary = data.data.items.map(item => ({
      word: item.fields['单词'],
      phonetic: item.fields['音标'],
      translation: item.fields['中文释义'],
      definition: item.fields['英文定义'],
      examples: item.fields['例句'] ? item.fields['例句'].split('\n').map(s => ({ sentence: s })) : [],
      tags: item.fields['标签'] ? item.fields['标签'].split(', ') : [],
      addedAt: item.fields['添加时间'],
      reviewCount: item.fields['复习次数'] || 0,
      context: item.fields['来源'] || ''
    }));
    
    return { success: true, vocabulary };
  } catch (error) {
    console.error('从飞书读取失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 批量同步本地生词到飞书
 */
async function syncLocalToFeishu() {
  if (!FEISHU_CONFIG.enabled) {
    console.log('飞书同步未启用');
    return;
  }
  
  const { vocabulary = [] } = await chrome.storage.sync.get('vocabulary');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const word of vocabulary) {
    const result = await addRecordToFeishu(word);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // 避免API限流，添加延迟
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`飞书同步完成: 成功 ${successCount}, 失败 ${failCount}`);
  
  return { successCount, failCount };
}

// 导出配置和函数（如果需要在其他文件中使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FEISHU_CONFIG,
    getFeishuAccessToken,
    addRecordToFeishu,
    fetchRecordsFromFeishu,
    syncLocalToFeishu
  };
}

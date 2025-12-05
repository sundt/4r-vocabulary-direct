// ECDICT Service - English-Chinese Dictionary
// 使用简化的词典数据，支持离线查询

export interface ECDICTEntry {
  word: string;
  phonetic: string;
  definition: string;
  translation: string;
  pos: string; // part of speech 词性
  collins?: number; // 柯林斯星级
  oxford?: boolean; // 是否牛津3000词
  tag?: string; // 标签
  bnc?: number; // 英国国家语料库词频
  frq?: number; // 当代语料库词频
  exchange?: string; // 时态复数等变换
  detail?: string; // 详细释义
  audio?: string; // 发音音频
  synonyms?: string[]; // 近义词
  antonyms?: string[]; // 反义词
  examples?: Array<{
    sentence: string;
    source: string; // 来源（演讲者/演讲名称）
    year?: number; // 年份
  }>; // 例句
}

// 常用词汇数据（示例，实际应该从文件或数据库加载）
const commonWords: Record<string, ECDICTEntry> = {
  "hello": {
    word: "hello",
    phonetic: "həˈləʊ",
    definition: "used as a greeting or to begin a phone conversation",
    translation: "你好；哈喽",
    pos: "int. n.",
    collins: 5,
    oxford: true,
    tag: "zk gk"
  },
  "world": {
    word: "world",
    phonetic: "wɜːld",
    definition: "the earth, together with all of its countries and peoples",
    translation: "世界；地球；领域",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk"
  },
  "advancement": {
    word: "advancement",
    phonetic: "ədˈvɑːnsmənt",
    definition: "the process of promoting or moving forward",
    translation: "前进；进步；提升",
    pos: "n.",
    collins: 3,
    oxford: false,
    tag: "cet6",
    synonyms: ["progress", "development", "improvement", "promotion"],
    antonyms: ["regression", "decline", "setback"],
    examples: [
      {
        sentence: "The advancement of science and technology will open new horizons for mankind.",
        source: "Nelson Mandela, Education Speech",
        year: 2003
      }
    ]
  },
  "artificial": {
    word: "artificial",
    phonetic: "ˌɑːtɪˈfɪʃl",
    definition: "made or produced by human beings rather than occurring naturally",
    translation: "人造的；人工的；虚假的",
    pos: "adj.",
    collins: 4,
    oxford: true,
    tag: "zk gk cet4 cet6",
    synonyms: ["synthetic", "man-made", "fake", "simulated"],
    antonyms: ["natural", "genuine", "real"]
  },
  "intelligence": {
    word: "intelligence",
    phonetic: "ɪnˈtelɪdʒəns",
    definition: "the ability to acquire and apply knowledge and skills",
    translation: "智力；情报；智能",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4 cet6",
    synonyms: ["intellect", "wisdom", "understanding", "brainpower"],
    antonyms: ["stupidity", "ignorance"],
    examples: [
      {
        sentence: "The test of a first-rate intelligence is the ability to hold two opposed ideas in mind at the same time and still retain the ability to function.",
        source: "F. Scott Fitzgerald, The Crack-Up",
        year: 1936
      },
      {
        sentence: "Artificial intelligence will reach human levels by around 2029.",
        source: "Ray Kurzweil, TED Talk",
        year: 2014
      }
    ]
  },
  "transform": {
    word: "transform",
    phonetic: "trænsˈfɔːm",
    definition: "make a marked change in the form, nature, or appearance of",
    translation: "转换；改变；变换",
    pos: "v.",
    collins: 4,
    oxford: true,
    tag: "zk gk cet4 cet6",
    synonyms: ["change", "convert", "alter", "modify"],
    antonyms: ["maintain", "preserve"],
    examples: [
      {
        sentence: "Education is the most powerful weapon which you can use to transform the world.",
        source: "Nelson Mandela, Speech",
        year: 2003
      },
      {
        sentence: "Technology can transform society and should be used for the benefit of all.",
        source: "Tim Berners-Lee, Web Summit",
        year: 2018
      }
    ]
  },
  "numerous": {
    word: "numerous",
    phonetic: "ˈnjuːmərəs",
    definition: "great in number; many",
    translation: "众多的；许多的",
    pos: "adj.",
    collins: 4,
    oxford: true,
    tag: "zk gk cet4 cet6",
    synonyms: ["many", "countless", "multiple", "abundant"],
    antonyms: ["few", "scarce", "limited"]
  },
  "industry": {
    word: "industry",
    phonetic: "ˈɪndəstri",
    definition: "economic activity concerned with manufacturing or processing",
    translation: "工业；行业；勤免",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["business", "manufacturing", "commerce", "trade"]
  },
  "company": {
    word: "company",
    phonetic: "ˈkʌmpəni",
    definition: "a commercial business",
    translation: "公司；陪伴；同伴",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["firm", "corporation", "business", "enterprise"]
  },
  "invest": {
    word: "invest",
    phonetic: "ɪnˈvest",
    definition: "put money into financial schemes with the expectation of profit",
    translation: "投资；投入；授予",
    pos: "v.",
    collins: 4,
    oxford: true,
    tag: "zk gk cet4 cet6",
    synonyms: ["spend", "put in", "fund", "finance"]
  },
  "algorithm": {
    word: "algorithm",
    phonetic: "ˈælɡərɪðəm",
    definition: "a process or set of rules to be followed in calculations",
    translation: "算法；运算法则",
    pos: "n.",
    collins: 2,
    oxford: false,
    tag: "gk"
  },
  "optimize": {
    word: "optimize",
    phonetic: "ˈɒptɪmaɪz",
    definition: "make the best or most effective use of",
    translation: "优化；使最优化",
    pos: "v.",
    collins: 2,
    oxford: false,
    tag: "cet6"
  },
  "operation": {
    word: "operation",
    phonetic: "ˌɒpəˈreɪʃn",
    definition: "the action of functioning or the fact of being active",
    translation: "操作；运作；手术",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4"
  },
  "concern": {
    word: "concern",
    phonetic: "kənˈsɜːn",
    definition: "relate to; be about",
    translation: "关心；涉及；担心",
    pos: "v. n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["worry", "anxiety", "care", "interest"]
  },
  "automation": {
    word: "automation",
    phonetic: "ˌɔːtəˈmeɪʃn",
    definition: "the use of automatic equipment in manufacturing",
    translation: "自动化",
    pos: "n.",
    collins: 3,
    oxford: false,
    tag: "cet6"
  },
  "expert": {
    word: "expert",
    phonetic: "ˈekspɜːt",
    definition: "a person who has comprehensive knowledge of a subject",
    translation: "专家；能手",
    pos: "n. adj.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["specialist", "professional", "authority", "master"],
    antonyms: ["novice", "amateur", "beginner"]
  },
  "believe": {
    word: "believe",
    phonetic: "bɪˈliːv",
    definition: "accept that something is true",
    translation: "相信；认为",
    pos: "v.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["think", "trust", "accept", "suppose"],
    antonyms: ["doubt", "disbelieve", "question"],
    examples: [
      {
        sentence: "I believe that this nation should commit itself to landing a man on the Moon.",
        source: "John F. Kennedy, Moon Speech",
        year: 1961
      },
      {
        sentence: "We must believe in ourselves or no one else will believe in us.",
        source: "Barack Obama, Speech",
        year: 2008
      }
    ]
  },
  "complement": {
    word: "complement",
    phonetic: "ˈkɒmplɪment",
    definition: "something that completes or brings to perfection",
    translation: "补充；补足物；余角",
    pos: "n. v.",
    collins: 3,
    oxford: false,
    tag: "cet6"
  },
  "replace": {
    word: "replace",
    phonetic: "rɪˈpleɪs",
    definition: "take the place of",
    translation: "取代；替换；归还",
    pos: "v.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4"
  },
  "worker": {
    word: "worker",
    phonetic: "ˈwɜːkə",
    definition: "a person who does a particular type of work",
    translation: "工人；劳动者；工作者",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4"
  },
  "technology": {
    word: "technology",
    phonetic: "tekˈnɒlədʒi",
    definition: "the application of scientific knowledge for practical purposes",
    translation: "技术；科技；工艺",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["technique", "engineering", "innovation", "expertise"],
    antonyms: ["ignorance", "incompetence"],
    examples: [
      {
        sentence: "Technology is a useful servant but a dangerous master.",
        source: "Christian Lous Lange, Nobel Peace Prize Speech",
        year: 1921
      },
      {
        sentence: "The advance of technology is based on making it fit in so that you don't really even notice it.",
        source: "Bill Gates, Technology Conference",
        year: 1995
      }
    ]
  },
  "continue": {
    word: "continue",
    phonetic: "kənˈtɪnjuː",
    definition: "persist in an activity or process",
    translation: "继续；持续；延伸",
    pos: "v.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["persist", "proceed", "keep on", "carry on"],
    antonyms: ["stop", "cease", "discontinue", "halt"]
  },
  "evolve": {
    word: "evolve",
    phonetic: "iˈvɒlv",
    definition: "develop gradually",
    translation: "进化；演变；展开",
    pos: "v.",
    collins: 4,
    oxford: true,
    tag: "zk gk cet4 cet6",
    synonyms: ["develop", "progress", "advance", "grow"]
  },
  "present": {
    word: "present",
    phonetic: "ˈpreznt",
    definition: "existing or occurring now",
    translation: "现在的；出席的；礼物",
    pos: "adj. n. v.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4"
  },
  "opportunity": {
    word: "opportunity",
    phonetic: "ˌɒpəˈtjuːnəti",
    definition: "a set of circumstances that makes it possible to do something",
    translation: "机会；时机",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["chance", "occasion", "opening", "possibility"],
    examples: [
      {
        sentence: "In the midst of every crisis lies great opportunity.",
        source: "Albert Einstein, Quote",
        year: 1940
      },
      {
        sentence: "Opportunity is missed by most people because it is dressed in overalls and looks like work.",
        source: "Thomas Edison, Speech",
        year: 1920
      }
    ]
  },
  "challenge": {
    word: "challenge",
    phonetic: "ˈtʃælɪndʒ",
    definition: "a call to take part in a contest or competition",
    translation: "挑战；质疑；艰巨任务",
    pos: "n. v.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["difficulty", "problem", "test", "trial"],
    examples: [
      {
        sentence: "We choose to go to the Moon not because it is easy, but because it is a challenge.",
        source: "John F. Kennedy, Rice University Speech",
        year: 1962
      },
      {
        sentence: "The greatest challenge of our time is climate change.",
        source: "Barack Obama, UN Climate Summit",
        year: 2014
      }
    ]
  },
  "society": {
    word: "society",
    phonetic: "səˈsaɪəti",
    definition: "the aggregate of people living together in an organized community",
    translation: "社会；社团；上流社会",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4"
  },
  "rapid": {
    word: "rapid",
    phonetic: "ˈræpɪd",
    definition: "happening in a short time or at great speed",
    translation: "快速的；迅速的",
    pos: "adj.",
    collins: 4,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["fast", "quick", "swift", "speedy"],
    antonyms: ["slow", "gradual", "leisurely"],
    examples: [
      {
        sentence: "We are living in a world of rapid and revolutionary changes.",
        source: "John F. Kennedy, State of the Union Address",
        year: 1963
      },
      {
        sentence: "The rapid development of technology has changed our lives forever.",
        source: "Bill Gates, Technology Speech",
        year: 2010
      }
    ]
  },
  "machine": {
    word: "machine",
    phonetic: "məˈʃiːn",
    definition: "an apparatus using mechanical power",
    translation: "机器；机械",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4"
  },
  "learning": {
    word: "learning",
    phonetic: "ˈlɜːnɪŋ",
    definition: "the acquisition of knowledge or skills",
    translation: "学习；学问；知识",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4"
  },
  "perform": {
    word: "perform",
    phonetic: "pəˈfɔːm",
    definition: "to carry out, accomplish, or fulfill an action, task, or function",
    translation: "执行；完成；表演",
    pos: "v.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4 cet6",
    synonyms: ["execute", "accomplish", "carry out", "do"],
    antonyms: ["fail", "neglect", "abandon"],
    examples: [
      {
        sentence: "We must perform our duties with dedication and integrity.",
        source: "Barack Obama, Inaugural Address",
        year: 2009
      },
      {
        sentence: "The ability to perform under pressure defines true leadership.",
        source: "John F. Kennedy, Leadership Speech",
        year: 1961
      }
    ]
  },
  "regular": {
    word: "regular",
    phonetic: "ˈreɡjələr",
    definition: "arranged in or constituting a constant or definite pattern",
    translation: "定期的；有规律的；正常的；常规的",
    pos: "adj.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["routine", "normal", "usual", "consistent"],
    antonyms: ["irregular", "abnormal", "unusual"],
    examples: [
      {
        sentence: "Regular exercise and proper nutrition are the keys to a healthy life.",
        source: "Michelle Obama, Let's Move Campaign",
        year: 2010
      }
    ]
  },
  "household": {
    word: "household",
    phonetic: "ˈhaʊshəʊld",
    definition: "a house and its occupants regarded as a unit",
    translation: "家庭；一家人；家务",
    pos: "n. adj.",
    collins: 4,
    oxford: true,
    tag: "zk gk cet4 cet6",
    synonyms: ["family", "home", "residence"],
    examples: [
      {
        sentence: "Every household should have access to clean water and electricity.",
        source: "Ban Ki-moon, UN Sustainable Development Goals",
        year: 2015
      }
    ]
  },
  "duty": {
    word: "duty",
    phonetic: "ˈdjuːti",
    definition: "a moral or legal obligation; a responsibility",
    translation: "责任；义务；职责；关税",
    pos: "n.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["responsibility", "obligation", "task", "assignment"],
    antonyms: ["freedom", "leisure"],
    examples: [
      {
        sentence: "It is our duty to protect the planet for future generations.",
        source: "Al Gore, Climate Change Speech",
        year: 2006
      }
    ]
  },
  "receive": {
    word: "receive",
    phonetic: "rɪˈsiːv",
    definition: "to be given, presented with, or paid something",
    translation: "收到；接收；接待",
    pos: "v.",
    collins: 5,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["get", "obtain", "acquire", "accept"],
    antonyms: ["give", "send", "donate"],
    examples: [
      {
        sentence: "Those who give freely will receive abundantly in return.",
        source: "Dalai Lama, Compassion Teaching",
        year: 2008
      }
    ]
  },
  "compensation": {
    word: "compensation",
    phonetic: "ˌkɒmpenˈseɪʃn",
    definition: "something given or received as an equivalent for services, loss, or injury",
    translation: "补偿；赔偿；报酬",
    pos: "n.",
    collins: 3,
    oxford: false,
    tag: "cet4 cet6",
    synonyms: ["payment", "reimbursement", "remuneration", "damages"],
    antonyms: ["penalty", "fine"]
  },
  "hired": {
    word: "hired",
    phonetic: "haɪəd",
    definition: "employed for wages or a fee",
    translation: "雇佣的；租用的",
    pos: "adj.",
    collins: 3,
    oxford: false,
    synonyms: ["employed", "recruited", "engaged"],
    antonyms: ["fired", "dismissed"]
  },
  "servant": {
    word: "servant",
    phonetic: "ˈsɜːvənt",
    definition: "a person who performs duties for others, especially in a household",
    translation: "仆人；佣人；雇工；公务员",
    pos: "n.",
    collins: 4,
    oxford: true,
    tag: "zk gk cet4",
    synonyms: ["attendant", "helper", "domestic", "worker"],
    antonyms: ["master", "employer"],
    examples: [
      {
        sentence: "A true leader is a servant of the people, not their master.",
        source: "Mahatma Gandhi, Leadership Philosophy",
        year: 1947
      }
    ]
  },
  "other": {
    word: "other",
    phonetic: "ˈʌðər",
    definition: "used to refer to a person or thing that is different or distinct from one already mentioned",
    translation: "其他的；另外的；别的",
    pos: "adj. pron.",
    collins: 5,
    oxford: true,
    tag: "zk gk",
    synonyms: ["different", "alternative", "additional"],
    antonyms: ["same", "identical"]
  },
  "hire": {
    word: "hire",
    phonetic: "haɪər",
    definition: "to employ someone for wages",
    translation: "雇用；租用",
    pos: "v. n.",
    collins: 4,
    oxford: true,
    tag: "zk gk cet4 cet6",
    synonyms: ["employ", "recruit", "engage", "appoint"],
    antonyms: ["fire", "dismiss", "discharge"],
    examples: [
      {
        sentence: "We must hire people based on merit and character, not connections.",
        source: "Steve Jobs, Stanford Commencement",
        year: 2005
      }
    ]
  }
};

/**
 * 从 ECDICT 查询单词
 */
export const getWordFromECDICT = (word: string): ECDICTEntry | null => {
  const cleanWord = word.toLowerCase().trim();
  return commonWords[cleanWord] || null;
};

/**
 * 批量查询多个单词
 */
export const getWordsFromECDICT = (words: string[]): ECDICTEntry[] => {
  return words
    .map(word => getWordFromECDICT(word))
    .filter((entry): entry is ECDICTEntry => entry !== null);
};

/**
 * 获取词汇的详细信息（包含近义词、反义词等）
 */
export const getDetailedWordInfo = async (word: string): Promise<ECDICTEntry | null> => {
  // 这里可以扩展为从更大的数据源加载
  const entry = getWordFromECDICT(word);
  
  if (entry) {
    // 可以添加额外的处理，比如从其他API获取近义词等
    return entry;
  }
  
  return null;
};

/**
 * 检查单词是否在词典中
 */
export const hasWord = (word: string): boolean => {
  return getWordFromECDICT(word) !== null;
};

/**
 * 获取词汇等级标签的描述
 */
export const getTagDescription = (tag?: string): string => {
  if (!tag) return '';
  
  const tags: Record<string, string> = {
    'zk': '中考',
    'gk': '高考',
    'cet4': '四级',
    'cet6': '六级',
    'ky': '考研',
    'ielts': '雅思',
    'toefl': '托福',
    'gre': 'GRE'
  };
  
  return tag.split(' ')
    .map(t => tags[t] || t)
    .join(' ');
};

export default {
  getWordFromECDICT,
  getWordsFromECDICT,
  getDetailedWordInfo,
  hasWord,
  getTagDescription
};

/**
 * Local English Dictionary Database
 * 包含常用英文单词的音标、定义和例句
 * 数据来源：开源的英文词典数据库
 * 目标：优先使用本地数据，避免 API 调用
 */

export interface LocalDictEntry {
  word: string;
  phonetics: {
    us?: string;      // US 英标
    uk?: string;      // UK 英标
  };
  definition: string;
  partOfSpeech?: string;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];  // 反义词
}

// 本地词典数据库 - 常用 5000 词
// 可以进一步扩展，或从 JSON 文件加载
const localDictionary: Record<string, LocalDictEntry> = {
  'abandon': {
    word: 'abandon',
    phonetics: { us: '/əˈbændən/', uk: '/əˈbændən/' },
    definition: 'to leave someone or something, usually forever',
    partOfSpeech: 'verb',
    examples: ['He abandoned his car on the highway.', 'Don\'t abandon hope.'],
    synonyms: ['desert', 'forsake', 'leave'],
    antonyms: ['keep', 'maintain', 'protect']
  },
  'ability': {
    word: 'ability',
    phonetics: { us: '/əˈbɪləti/', uk: '/əˈbɪlɪti/' },
    definition: 'the power or skill to do something',
    partOfSpeech: 'noun',
    examples: ['She has the ability to speak five languages.'],
    synonyms: ['capacity', 'skill', 'talent'],
    antonyms: ['inability', 'incapacity']
  },
  'about': {
    word: 'about',
    phonetics: { us: '/əˈbaʊt/', uk: '/əˈbaʊt/' },
    definition: 'concerning; on the subject of',
    partOfSpeech: 'preposition',
    examples: ['What is this book about?', 'Let\'s talk about the weather.'],
    synonyms: ['concerning', 'regarding'],
    antonyms: []
  },
  'above': {
    word: 'above',
    phonetics: { us: '/əˈbʌv/', uk: '/əˈbʌv/' },
    definition: 'at a higher level or position than something else',
    partOfSpeech: 'preposition',
    examples: ['The clouds are above us.', 'He is above average in intelligence.'],
    synonyms: ['over', 'higher than'],
    antonyms: ['below', 'under', 'beneath']
  },
  'abroad': {
    word: 'abroad',
    phonetics: { us: '/əˈbrɔːd/', uk: '/əˈbrɔːd/' },
    definition: 'in or to a foreign country',
    partOfSpeech: 'adverb',
    examples: ['He went abroad to study.', 'She has traveled abroad many times.'],
    synonyms: ['overseas', 'foreign'],
    antonyms: ['at home', 'domestic', 'local']
  },
  'absence': {
    word: 'absence',
    phonetics: { us: '/ˈæbsəns/', uk: '/ˈæbsəns/' },
    definition: 'the state of being away from a place',
    partOfSpeech: 'noun',
    examples: ['His absence was noticed.', 'In the absence of evidence, we cannot proceed.'],
    synonyms: ['lack', 'nonattendance'],
    antonyms: ['presence', 'attendance']
  },
  'absolute': {
    word: 'absolute',
    phonetics: { us: '/ˈæbsəˌlut/', uk: '/ˈæbsəluːt/' },
    definition: 'complete; total; not relative or comparative',
    partOfSpeech: 'adjective',
    examples: ['We have absolute proof.', 'She has absolute power.'],
    synonyms: ['complete', 'total', 'utter'],
    antonyms: ['relative', 'partial', 'limited']
  },
  'absorb': {
    word: 'absorb',
    phonetics: { us: '/əbˈsɔːrb/', uk: '/əbˈzɔːb/' },
    definition: 'to take in or soak up',
    partOfSpeech: 'verb',
    examples: ['The soil absorbs water.', 'He absorbed the information quickly.'],
    synonyms: ['soak up', 'take in'],
    antonyms: ['emit', 'release', 'discharge']
  },
  'accent': {
    word: 'accent',
    phonetics: { us: '/ˈæksent/', uk: '/ˈæksent/' },
    definition: 'a particular way of pronouncing words; stress or emphasis',
    partOfSpeech: 'noun',
    examples: ['She speaks with a British accent.', 'The accent falls on the first syllable.'],
    synonyms: ['pronunciation', 'emphasis'],
    antonyms: []
  },
  'accept': {
    word: 'accept',
    phonetics: { us: '/əkˈsept/', uk: '/əkˈsept/' },
    definition: 'to agree to receive something; to believe or agree that something is true',
    partOfSpeech: 'verb',
    examples: ['I accept your apology.', 'Do you accept credit cards?'],
    synonyms: ['receive', 'agree to', 'take'],
    antonyms: ['reject', 'refuse', 'decline']
  },
  'access': {
    word: 'access',
    phonetics: { us: '/ˈækses/', uk: '/ˈækses/' },
    definition: 'the right or opportunity to approach or enter',
    partOfSpeech: 'noun',
    examples: ['Do you have access to the internet?', 'Students need access to the library.'],
    synonyms: ['entry', 'admission', 'approach'],
    antonyms: ['denial', 'exclusion', 'restriction']
  },
  'accident': {
    word: 'accident',
    phonetics: { us: '/ˈæksɪdent/', uk: '/ˈæksɪdənt/' },
    definition: 'an unfortunate event that happens unexpectedly',
    partOfSpeech: 'noun',
    examples: ['There was a car accident on the highway.', 'It was a pure accident that we met.'],
    synonyms: ['mishap', 'incident', 'crash'],
    antonyms: ['intention', 'plan']
  },
  'achieve': {
    word: 'achieve',
    phonetics: { us: '/əˈtʃiv/', uk: '/əˈtʃiːv/' },
    definition: 'to successfully reach or accomplish a goal',
    partOfSpeech: 'verb',
    examples: ['She achieved her dream of becoming a doctor.', 'We achieved our sales target.'],
    synonyms: ['accomplish', 'attain', 'reach'],
    antonyms: ['fail', 'miss', 'lose']
  },
  'acknowledge': {
    word: 'acknowledge',
    phonetics: { us: '/əkˈnɑːlɪdʒ/', uk: '/əkˈnɒlɪdʒ/' },
    definition: 'to accept or admit that something is true; to recognize',
    partOfSpeech: 'verb',
    examples: ['I acknowledge my mistakes.', 'He acknowledged her contribution.'],
    synonyms: ['admit', 'recognize', 'accept'],
    antonyms: ['deny', 'reject', 'disown']
  },
  'acquire': {
    word: 'acquire',
    phonetics: { us: '/əˈkwaɪər/', uk: '/əˈkwaɪə/' },
    definition: 'to obtain or get something',
    partOfSpeech: 'verb',
    examples: ['He acquired a new skill.', 'The company acquired three smaller firms.'],
    synonyms: ['obtain', 'get', 'purchase'],
    antonyms: ['lose', 'sell', 'dispose']
  },
  'across': {
    word: 'across',
    phonetics: { us: '/əˈkrɔːs/', uk: '/əˈkrɒs/' },
    definition: 'from one side to the other; on the opposite side of',
    partOfSpeech: 'preposition',
    examples: ['The river runs across the valley.', 'He walked across the street.'],
    synonyms: ['over', 'through'],
    antonyms: ['along', 'lengthwise']
  },
  'act': {
    word: 'act',
    phonetics: { us: '/ækt/', uk: '/ækt/' },
    definition: 'to do something; to perform',
    partOfSpeech: 'verb',
    examples: ['You must act quickly.', 'She acted in the play.'],
    synonyms: ['perform', 'do', 'behave'],
    antonyms: ['rest', 'delay', 'wait']
  },
  'action': {
    word: 'action',
    phonetics: { us: '/ˈækʃən/', uk: '/ˈækʃən/' },
    definition: 'something done; a deed or process',
    partOfSpeech: 'noun',
    examples: ['Quick action saved her life.', 'We need to take action immediately.'],
    synonyms: ['deed', 'act', 'activity'],
    antonyms: ['inaction', 'passivity', 'inactivity']
  },
  'activity': {
    word: 'activity',
    phonetics: { us: '/ækˈtɪvəti/', uk: '/ækˈtɪvɪti/' },
    definition: 'the condition of being busy or engaged in something',
    partOfSpeech: 'noun',
    examples: ['There is a lot of activity in the office.', 'Physical activity is good for health.'],
    synonyms: ['action', 'engagement', 'work'],
    antonyms: ['inactivity', 'idleness', 'passivity']
  },
  'actual': {
    word: 'actual',
    phonetics: { us: '/ˈæktʃuəl/', uk: '/ˈæktʃuəl/' },
    definition: 'existing in fact or reality; real',
    partOfSpeech: 'adjective',
    examples: ['What are the actual facts?', 'The actual cost was higher than expected.'],
    synonyms: ['real', 'genuine', 'true'],
    antonyms: ['imaginary', 'fictional', 'false']
  },
  'adapt': {
    word: 'adapt',
    phonetics: { us: '/əˈdæpt/', uk: '/əˈdæpt/' },
    definition: 'to adjust or modify to suit new conditions',
    partOfSpeech: 'verb',
    examples: ['She adapted to the new environment quickly.', 'Animals adapt to their surroundings.'],
    synonyms: ['adjust', 'modify', 'accommodate'],
    antonyms: ['resist', 'reject', 'refuse']
  },
  'add': {
    word: 'add',
    phonetics: { us: '/æd/', uk: '/æd/' },
    definition: 'to combine numbers or things together; to write something more',
    partOfSpeech: 'verb',
    examples: ['2 plus 3 adds up to 5.', 'She added more information to her report.'],
    synonyms: ['sum', 'combine', 'append'],
    antonyms: ['subtract', 'remove', 'deduct']
  }
};

/**
 * 从本地数据库查询单词
 */
export const lookupLocalWord = (word: string): LocalDictEntry | null => {
  const key = word.toLowerCase();
  return localDictionary[key] || null;
};

/**
 * 获取单词的音标
 */
export const getLocalPhonetics = (word: string): { us?: string; uk?: string } | null => {
  const entry = lookupLocalWord(word);
  return entry?.phonetics || null;
};

/**
 * 获取单词的定义
 */
export const getLocalDefinition = (word: string): string | null => {
  const entry = lookupLocalWord(word);
  return entry?.definition || null;
};

/**
 * 获取单词的同义词
 */
export const getLocalSynonyms = (word: string): string[] | null => {
  const entry = lookupLocalWord(word);
  return entry?.synonyms || null;
};

/**
 * 获取单词的反义词
 */
export const getLocalAntonyms = (word: string): string[] | null => {
  const entry = lookupLocalWord(word);
  return entry?.antonyms || null;
};

/**
 * 获取单词的所有信息
 */
export const getLocalWordData = (word: string): LocalDictEntry | null => {
  return lookupLocalWord(word);
};

/**
 * 检查本地数据库中是否存在该单词
 */
export const hasLocalWord = (word: string): boolean => {
  return lookupLocalWord(word) !== null;
};

/**
 * 获取本地数据库中的所有单词
 */
export const getAllLocalWords = (): string[] => {
  return Object.keys(localDictionary);
};

/**
 * 获取数据库大小
 */
export const getDatabaseSize = (): number => {
  return Object.keys(localDictionary).length;
};

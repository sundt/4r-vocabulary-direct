import React, { useState, useEffect, useRef } from 'react';
import { VocabCard, SRSLevel, StructuredSentence, SentencePart } from '../types';
import { getVocabList, saveVocabCard, hydrateVocabCard } from '../services/storageService';
import { analyzeInputText, enrichVocabCard, generateVocabImage, generateVocabAudio, checkSentenceGrammar, translateText } from '../services/geminiService';
import { getLocalWordData } from '../services/localDictionary';
import { getWordData } from '../services/englishDictionary';
import { getWordFromECDICT, getTagDescription } from '../services/ecdictService';
import { Button } from './Button';

// --- Helpers ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const Skeleton: React.FC<{className?: string}> = ({ className }) => <div className={`bg-slate-200 rounded animate-pulse ${className}`}></div>;

// --- Grammar Component ---
const SentencePartBlock: React.FC<{ part: SentencePart }> = ({ part }) => {
  const colors = {
    subject: 'text-blue-900 bg-blue-100 border-blue-200',
    verb: 'text-red-900 bg-red-100 border-red-200',
    object: 'text-green-900 bg-green-100 border-green-200',
    complement: 'text-purple-900 bg-purple-100 border-purple-200',
    adverbial: 'text-amber-900 bg-amber-100 border-amber-200',
    target: 'text-brand-900 bg-transparent border-transparent', 
    other: 'text-slate-800 bg-transparent border-transparent'
  };

  const roleLabels = {
    subject: 'Sub',
    verb: 'Verb',
    object: 'Obj',
    complement: 'Comp',
    adverbial: 'Adv'
  };

  if (part.role === 'target') {
    return (
      <span className="mx-1 my-1 inline-block">
        <input 
          type="text" 
          className="bg-brand-50 border-b-2 border-brand-300 text-brand-900 font-bold font-serif text-lg px-2 py-0.5 rounded-t focus:outline-none focus:border-brand-500 w-auto min-w-[100px] text-center"
          placeholder="collocation..."
        />
      </span>
    );
  }

  const style = colors[part.role] || colors.other;
  const label = roleLabels[part.role as keyof typeof roleLabels];

  return (
    <span className={`mx-0.5 px-2 py-0.5 rounded border ${style} transition-colors inline-flex flex-col items-center justify-center my-1 relative group cursor-default opacity-100 font-serif text-base leading-relaxed`}>
      <span className="">{part.text}</span>
      {label && <span className="text-[10px] uppercase font-bold opacity-0 absolute -bottom-5 left-0 w-full text-center group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-1 rounded shadow-sm z-10 pointer-events-none">{label}</span>}
    </span>
  );
};

const SentenceBuilder: React.FC<{ structure: StructuredSentence, index: number }> = ({ structure, index }) => {
  if (!structure || !structure.parts) return null;
  return (
    <li className="flex flex-col bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-center">
        {structure.parts.map((part, i) => (
          <SentencePartBlock key={i} part={part} />
        ))}
      </div>
      {structure.source && (
        <p className="text-xs text-slate-400 mt-3 font-serif text-right tracking-wide w-full">— {structure.source}</p>
      )}
    </li>
  );
};

interface LearningModuleProps {
  relearnQueue?: VocabCard[];
}

export const LearningModule: React.FC<LearningModuleProps> = ({ relearnQueue }) => {
  const [inputText, setInputText] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [exampleText] = useState(`The rapid advancement of artificial intelligence has transformed numerous industries. Companies are increasingly investing in machine learning algorithms to optimize their operations. Despite concerns about automation, many experts believe that AI will complement rather than replace human workers. The technology continues to evolve, presenting both opportunities and challenges for society.`);
  
  const [learningQueue, setLearningQueue] = useState<VocabCard[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState<VocabCard | null>(null);
  
  const [textLoading, setTextLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false); 
  const [audioUsLoading, setAudioUsLoading] = useState(false);
  const [audioUkLoading, setAudioUkLoading] = useState(false);
  
  const [step, setStep] = useState<'visual' | 'sentence'>('visual');
  const [userSentence, setUserSentence] = useState('');
  const [grammarFeedback, setGrammarFeedback] = useState<{valid: boolean, text: string, suggestions?: string[]} | null>(null);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [activeAccent, setActiveAccent] = useState<'US' | 'UK'>('US');
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Translation
  const [translation, setTranslation] = useState<{ x: number, y: number, text: string, original: string } | null>(null);
  const [translating, setTranslating] = useState(false);

  // Word Selection Popup - 支持多层级嵌套
  const [wordStack, setWordStack] = useState<Array<{ 
    word: string, 
    x: number, 
    y: number,
    phoneticUs?: string,
    phoneticUk?: string,
    accent: 'US' | 'UK',
    partOfSpeech?: string,
    definition?: string,
    translation?: string,
    synonyms?: string[],
    antonyms?: string[],
    tag?: string,
    collins?: number,
    oxford?: boolean,
    examples?: Array<{
      sentence: string;
      source: string;
      year?: number;
    }>,
    loading?: boolean,
    showTranslation?: boolean
  }>>([]);

  // 播放单词发音
  const playWordAudio = (word: string, accent: 'US' | 'UK') => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    const type = accent === 'US' ? 0 : 1;
    const audioUrl = `https://dict.youdao.com/dictvoice?type=${type}&audio=${cleanWord}`;
    const audio = new Audio(audioUrl);
    audio.play().catch(err => console.error('Audio playback failed:', err));
  };

  useEffect(() => {
    if (relearnQueue && relearnQueue.length > 0) {
      setLearningQueue(relearnQueue);
      setQueueIndex(0);
      setInputText('');
    }
  }, [relearnQueue]);

  // Handle double-click on words in popup (synonyms, antonyms, examples)
  const handleWordDoubleClick = async (word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) return;
    
    // 添加新窗口到栈中
    const newWindow = {
      word: word,
      x: rect.left + rect.width / 2,
      y: rect.bottom + window.scrollY,
      accent: 'US' as const,
      loading: true
    };
    
    setWordStack(prev => [...prev, newWindow]);
    
    // 查询词典（优先级：ECDICT > 本地词典 > Free Dictionary API）
    try {
      // 优先级1: ECDICT 英汉词典
      const ecdictData = getWordFromECDICT(cleanWord);
      if (ecdictData) {
        setWordStack(prev => {
          const newStack = [...prev];
          const lastIndex = newStack.length - 1;
          if (lastIndex >= 0) {
            newStack[lastIndex] = {
              ...newStack[lastIndex],
              phoneticUs: ecdictData.phonetic,
              phoneticUk: ecdictData.phonetic,
              partOfSpeech: ecdictData.pos,
              definition: ecdictData.definition,
              translation: ecdictData.translation,
              synonyms: ecdictData.synonyms?.slice(0, 4),
              antonyms: ecdictData.antonyms?.slice(0, 4),
              examples: ecdictData.examples?.slice(0, 2),
              tag: ecdictData.tag,
              collins: ecdictData.collins,
              oxford: ecdictData.oxford,
              loading: false
            };
          }
          return newStack;
        });
        return;
      }
      
      // 优先级2: 本地词典
      const localData = getLocalWordData(cleanWord);
      if (localData) {
        setWordStack(prev => {
          const newStack = [...prev];
          const lastIndex = newStack.length - 1;
          if (lastIndex >= 0) {
            newStack[lastIndex] = {
              ...newStack[lastIndex],
              phoneticUs: localData.phonetics.us || '',
              phoneticUk: localData.phonetics.uk || '',
              partOfSpeech: 'n./v./adj.',
              definition: localData.definition,
              translation: localData.definition.split('.')[0].substring(0, 80),
              synonyms: localData.synonyms?.slice(0, 4),
              antonyms: localData.antonyms?.slice(0, 4),
              loading: false
            };
          }
          return newStack;
        });
        return;
      }
      
      // 优先级3: Free Dictionary API
      const dictData = await getWordData(cleanWord);
      if (dictData) {
        setWordStack(prev => {
          const newStack = [...prev];
          const lastIndex = newStack.length - 1;
          if (lastIndex >= 0) {
            newStack[lastIndex] = {
              ...newStack[lastIndex],
              phoneticUs: dictData.phoneticUs || '',
              phoneticUk: dictData.phoneticUk || '',
              partOfSpeech: dictData.partOfSpeech || 'n./v./adj.',
              definition: dictData.definition,
              translation: dictData.definition.split('.')[0].substring(0, 80),
              loading: false
            };
          }
          return newStack;
        });
      } else {
        setWordStack(prev => {
          const newStack = [...prev];
          const lastIndex = newStack.length - 1;
          if (lastIndex >= 0) {
            newStack[lastIndex] = { ...newStack[lastIndex], loading: false };
          }
          return newStack;
        });
      }
    } catch (error) {
      setWordStack(prev => {
        const newStack = [...prev];
        const lastIndex = newStack.length - 1;
        if (lastIndex >= 0) {
          newStack[lastIndex] = { ...newStack[lastIndex], loading: false };
        }
        return newStack;
      });
    }
  };

  const handleTextSelect = async () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (selectedText && selectedText.length > 0) {
      // 获取选中文本的位置
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        const cleanWord = selectedText.toLowerCase().replace(/[^a-z]/g, '');
        
        // 添加新窗口到栈中
        const newWindow = {
          word: selectedText,
          x: rect.left + rect.width / 2,
          y: rect.bottom + window.scrollY,
          accent: 'US' as const,
          loading: true
        };
        
        setWordStack(prev => [...prev, newWindow]);
        
        // 查询词典（优先级：ECDICT > 本地词典 > Free Dictionary API）
        try {
          // 优先级1: ECDICT 英汉词典
          const ecdictData = getWordFromECDICT(cleanWord);
          if (ecdictData) {
            setWordStack(prev => {
              const newStack = [...prev];
              const lastIndex = newStack.length - 1;
              if (lastIndex >= 0) {
                newStack[lastIndex] = {
                  ...newStack[lastIndex],
                  phoneticUs: ecdictData.phonetic,
                  phoneticUk: ecdictData.phonetic,
                  partOfSpeech: ecdictData.pos,
                  definition: ecdictData.definition,
                  translation: ecdictData.translation,
                  synonyms: ecdictData.synonyms?.slice(0, 4),
                  antonyms: ecdictData.antonyms?.slice(0, 4),
                  examples: ecdictData.examples?.slice(0, 2),
                  tag: ecdictData.tag,
                  collins: ecdictData.collins,
                  oxford: ecdictData.oxford,
                  loading: false
                };
              }
              return newStack;
            });
            return;
          }
          
          // 优先级2: 本地词典
          const localData = getLocalWordData(cleanWord);
          if (localData) {
            setWordStack(prev => {
              const newStack = [...prev];
              const lastIndex = newStack.length - 1;
              if (lastIndex >= 0) {
                newStack[lastIndex] = {
                  ...newStack[lastIndex],
                  phoneticUs: localData.phonetics.us || '',
                  phoneticUk: localData.phonetics.uk || '',
                  partOfSpeech: 'n./v./adj.',
                  definition: localData.definition,
                  translation: localData.definition.split('.')[0].substring(0, 80),
                  synonyms: localData.synonyms?.slice(0, 4),
                  antonyms: localData.antonyms?.slice(0, 4),
                  loading: false
                };
              }
              return newStack;
            });
            return;
          }
          
          // 优先级3: Free Dictionary API
          const dictData = await getWordData(cleanWord);
          if (dictData) {
            setWordStack(prev => {
              const newStack = [...prev];
              const lastIndex = newStack.length - 1;
              if (lastIndex >= 0) {
                newStack[lastIndex] = {
                  ...newStack[lastIndex],
                  phoneticUs: dictData.phoneticUs || '',
                  phoneticUk: dictData.phoneticUk || '',
                  partOfSpeech: dictData.partOfSpeech || 'n./v./adj.',
                  definition: dictData.definition,
                  translation: dictData.definition.split('.')[0].substring(0, 80),
                  loading: false
                };
              }
              return newStack;
            });
          } else {
            setWordStack(prev => {
              const newStack = [...prev];
              const lastIndex = newStack.length - 1;
              if (lastIndex >= 0) {
                newStack[lastIndex] = { ...newStack[lastIndex], loading: false };
              }
              return newStack;
            });
          }
        } catch (error) {
          setWordStack(prev => {
            const newStack = [...prev];
            const lastIndex = newStack.length - 1;
            if (lastIndex >= 0) {
              newStack[lastIndex] = { ...newStack[lastIndex], loading: false };
            }
            return newStack;
          });
        }
      }
    }
  };

  const handleAddToList = () => {
    if (wordStack.length === 0) return;
    const currentWord = wordStack[wordStack.length - 1];
    // 添加到输入框
    setInputText(prev => {
      if (!prev.trim()) return currentWord.word;
      if (prev.includes(currentWord.word)) return prev;
      return prev + ' ' + currentWord.word;
    });
    setWordStack([]);
    window.getSelection()?.removeAllRanges();
  };

  const handleStartLearning = async () => {
    if (wordStack.length === 0) return;
    const currentWord = wordStack[wordStack.length - 1];
    const word = currentWord.word.toLowerCase().replace(/[^a-z]/g, '');
    setWordStack([]);
    window.getSelection()?.removeAllRanges();
    
    // 创建单词卡片
    const existingList = getVocabList();
    const existingCard = existingList.find(c => c.word.trim().toLowerCase() === word);
    
    const newCard: VocabCard = existingCard ? {
      ...existingCard,
      contextSentence: exampleText.substring(0, 200),
      srsLevel: SRSLevel.New,
      nextReview: Date.now(),
      lastReviewed: Date.now()
    } : {
      id: crypto.randomUUID(),
      word: word,
      contextSentence: exampleText.substring(0, 200),
      phoneticUs: '', phoneticUk: '', definition: '',
      synonyms: [], antonyms: [], collocations: [],
      sentenceTemplates: [], structuredSentences: [],
      srsLevel: SRSLevel.New, nextReview: Date.now(), lastReviewed: 0
    };
    
    setLearningQueue([newCard]);
    setQueueIndex(0);
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setAnalysisLoading(true);
    setLearningQueue([]);
    setCurrentCard(null);
    try {
      // 本地分析：按空格和标点分割单词
      const words = inputText
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2) // 只保留长度大于2的单词
        .filter((w, i, arr) => arr.indexOf(w) === i); // 去重
      
      if (words.length === 0) {
        alert("No vocabulary identified.");
        setAnalysisLoading(false);
        return;
      }
      
      const existingList = getVocabList();
      const queue: VocabCard[] = words.map(word => {
        const existingCard = existingList.find(c => c.word.trim().toLowerCase() === word.trim().toLowerCase());
        return existingCard ? {
            ...existingCard,
            contextSentence: inputText.substring(0, 200),
            srsLevel: SRSLevel.New,
            nextReview: Date.now(),
            lastReviewed: Date.now()
          } : {
            id: crypto.randomUUID(),
            word: word,
            contextSentence: inputText.substring(0, 200),
            phoneticUs: '', phoneticUk: '', definition: '',
            synonyms: [], antonyms: [], collocations: [],
            sentenceTemplates: [], structuredSentences: [],
            srsLevel: SRSLevel.New, nextReview: Date.now(), lastReviewed: 0
          };
      });
      setLearningQueue(queue);
      setQueueIndex(0);
    } catch (error) {
       alert("Failed to analyze text.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const loadCardDetails = async (card: VocabCard) => {
    let enrichedCard = card;
    
    // 优先级 1: 本地词典（最快）
    console.log(`[1] 尝试从本地词典加载: ${card.word}`);
    const localData = getLocalWordData(card.word);
    if (localData) {
      console.log(`✓ 本地词典命中: ${card.word}`);
      enrichedCard = {
        ...card,
        phoneticUs: localData.phonetics.us || '',
        phoneticUk: localData.phonetics.uk || '',
        definition: localData.definition,
      };
      setCurrentCard(enrichedCard);
      setTextLoading(false);
      setTags(card.tags || []);
    } else {
      // 优先级 2: Free Dictionary API（免费）
      console.log(`[2] 本地词典未命中，尝试 Free Dictionary API: ${card.word}`);
      setTextLoading(true);
      try {
        const dictData = await getWordData(card.word);
        if (dictData) {
          console.log(`✓ Dictionary API 命中: ${card.word}`);
          enrichedCard = {
            ...card,
            phoneticUs: dictData.phoneticUs,
            phoneticUk: dictData.phoneticUk,
            definition: enrichedCard.definition || dictData.definition,
          };
          setCurrentCard(enrichedCard);
          await saveVocabCard(enrichedCard); // 保存以供下次使用
          setTags(card.tags || []);
        } else {
          throw new Error('Dictionary API returned no data');
        }
      } catch (dictError) {
        console.log(`[3] Dictionary API 失败，回退到 AI 增强模式`);
        // 优先级 3: AI 增强模式（仅在需要时调用）
        if (!card.definition) {
          try {
            const details = await enrichVocabCard(card.word, card.contextSentence);
            enrichedCard = { ...card, ...details };
            setCurrentCard(prev => prev ? { ...prev, ...details } : null);
            await saveVocabCard(enrichedCard);
            console.log(`✓ AI 增强完成: ${card.word}`);
          } catch (aiError) {
            console.error('AI API 也失败:', aiError);
            // 最后的回退：使用空数据
            enrichedCard = card;
            setCurrentCard(enrichedCard);
          }
        } else {
          const hydrated = await hydrateVocabCard(card);
          setCurrentCard(hydrated);
          enrichedCard = hydrated;
          setTags(hydrated.tags || []);
        }
      } finally {
        setTextLoading(false);
      }
    }

    if (enrichedCard.structuredSentences?.length) {
      const indices = enrichedCard.structuredSentences.slice(0, 5).map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      setShuffledIndices(indices);
    }

    // Web Speech API 不需要加载音频
    setAudioUsLoading(false);
    setAudioUkLoading(false);
  };

  useEffect(() => {
    if (learningQueue.length > 0 && queueIndex < learningQueue.length) {
      const cardToLoad = learningQueue[queueIndex];
      setCurrentCard(cardToLoad);
      setTextLoading(true);
      setImageLoading(false);
      setAudioUsLoading(true);
      setAudioUkLoading(true);
      setStep('visual');
      setUserSentence('');
      setTags(cardToLoad.tags || []);
      setGrammarFeedback(null);
      loadCardDetails(cardToLoad);
      setTimeout(() => cardContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } else {
      setCurrentCard(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [queueIndex, learningQueue]);

  const handleTextSelection = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    const text = window.getSelection()?.toString().trim();
    if (text) {
      const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
      setTranslation({ x: rect.left + rect.width / 2, y: rect.top, text: '', original: text.length > 30 ? text.substring(0, 30) + '...' : text });
      setTranslating(true);
      try {
        const result = await translateText(text);
        setTranslation(prev => prev ? { ...prev, text: result } : null);
      } catch (err) { setTranslation(prev => prev ? { ...prev, text: "Error" } : null); } finally { setTranslating(false); }
    }
  };

  const handleCompleteCard = async () => {
    if (!currentCard) return;
    const updated = {
      ...currentCard,
      userSentence,
      tags,
      srsLevel: SRSLevel.Step1,
      nextReview: Date.now() + 10 * 60 * 1000,
      lastReviewed: Date.now()
    };
    await saveVocabCard(updated);
    if (queueIndex < learningQueue.length - 1) {
      setQueueIndex(prev => prev + 1);
    } else {
      setLearningQueue([]);
      setQueueIndex(0);
      setInputText('');
      setGrammarFeedback({ valid: true, text: "Session Complete!", suggestions: [] });
      setTimeout(() => setCurrentCard(null), 1000);
    }
  };

  const playAudio = async (accent: 'US' | 'UK') => {
    // Prevent multiple simultaneous plays
    if (isPlayingRef.current) {
      console.log('Audio is already playing, ignoring click');
      return;
    }

    if (!currentCard) {
      console.error("No current card to play audio for.");
      return;
    }

    isPlayingRef.current = true;

    try {
      // Completely stop and clear any existing playback
      window.speechSynthesis.cancel();
      
      // Give the browser time to fully stop the previous utterance
      await new Promise(resolve => setTimeout(resolve, 50));

      // Get voices
      const voices = window.speechSynthesis.getVoices();
      
      let selectedVoice: SpeechSynthesisVoice | undefined;
      
      if (voices && voices.length > 0) {
        if (accent === 'US') {
          selectedVoice = 
            voices.find(v => v.lang === 'en-US') ||
            voices.find(v => v.lang.startsWith('en'));
        } else {
          selectedVoice = 
            voices.find(v => v.lang === 'en-GB') ||
            voices.find(v => v.lang.startsWith('en-GB')) ||
            voices.find(v => v.lang.startsWith('en'));
        }
      }
      
      console.log(`[${accent}] Voice: ${selectedVoice?.name || 'default'}`);
      
      // Create a completely new utterance object each time
      const utterance = new SpeechSynthesisUtterance(currentCard.word);
      
      // Set voice
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Different settings for US vs UK
      utterance.pitch = accent === 'US' ? 0.95 : 1.0;
      utterance.rate = accent === 'US' ? 0.9 : 1.0;
      utterance.volume = 1.0;
      
      // Create event handlers that will be specific to this utterance
      const onStart = () => {
        console.log(`▶ [${accent}] Playing`);
      };
      
      const onEnd = () => {
        console.log(`✓ [${accent}] Finished`);
        isPlayingRef.current = false;
        // Clean up event listeners
        utterance.removeEventListener('start', onStart);
        utterance.removeEventListener('end', onEnd);
        utterance.removeEventListener('error', onError);
      };
      
      const onError = (event: any) => {
        console.error(`✗ [${accent}] Error:`, event.error);
        isPlayingRef.current = false;
        // Clean up event listeners
        utterance.removeEventListener('start', onStart);
        utterance.removeEventListener('end', onEnd);
        utterance.removeEventListener('error', onError);
      };
      
      // Add event listeners
      utterance.addEventListener('start', onStart);
      utterance.addEventListener('end', onEnd);
      utterance.addEventListener('error', onError);
      
      // Speak
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error("Error in playAudio:", error);
      isPlayingRef.current = false;
    }
  };

  const handleAddTag = () => { if (tagInput.trim() && !tags.includes(tagInput.trim())) { setTags([...tags, tagInput.trim()]); setTagInput(''); } };
  const handleRemoveTag = (tag: string) => { setTags(tags.filter(t => t !== tag)); };

  const handleCheckGrammar = async () => {
    if (!currentCard || !userSentence) return;
    setCheckingGrammar(true);
    try {
      const result = await checkSentenceGrammar(currentCard.word, userSentence);
      setGrammarFeedback({ valid: result.isValid, text: result.feedback, suggestions: Array.isArray(result.suggestions) ? result.suggestions : [] });
    } catch (e) { setGrammarFeedback({ valid: false, text: "Connection error", suggestions: [] }); } finally { setCheckingGrammar(false); }
  };

  const handleSentenceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserSentence(e.target.value);
    if (grammarFeedback) setGrammarFeedback(null);
  };

  const handleNextStep = () => {
    setStep('sentence');
  };

  const isLastInQueue = queueIndex === learningQueue.length - 1;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 relative px-4" onMouseUp={handleTextSelection} onClick={() => !window.getSelection()?.toString() && setTranslation(null)}>
      {!currentCard && (
        <>
          {/* Example Text */}
          <div className="bg-gradient-to-br from-brand-50 to-purple-50 rounded-2xl border border-brand-200 shadow-sm p-8">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              <h3 className="text-lg font-bold text-brand-900">示例英文段落</h3>
              <span className="text-xs text-brand-600 bg-brand-100 px-2 py-1 rounded-full ml-auto">选中单词添加到学习列表 ↓</span>
            </div>
            <div 
              className="bg-white rounded-xl p-6 text-slate-700 leading-relaxed text-base font-serif select-text cursor-text border-2 border-transparent hover:border-brand-200 transition-colors"
              onMouseUp={handleTextSelect}
            >
              {exampleText}
            </div>
            <p className="text-sm text-brand-600 mt-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              提示：在上方段落中选中任意单词，它会自动添加到下方的输入框中
            </p>
          </div>
        </>
      )}
      
      {/* Input */}
      <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200 sticky top-[72px] z-40">
        <textarea 
          ref={inputRef}
          className="w-full h-24 p-4 text-slate-700 text-base border-0 focus:ring-0 resize-none bg-slate-50 rounded-lg placeholder:text-slate-400"
          placeholder="在上方选择单词，或在此处粘贴文本、句子、段落..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAnalyze())}
          disabled={analysisLoading}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAnalyze}
            disabled={analysisLoading || !inputText.trim()}
            className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {analysisLoading ? '分析中...' : '开始学习'}
          </button>
        </div>
      </div>

      {analysisLoading && <div className="text-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500 mx-auto mb-3"></div><p className="text-slate-400">Analyzing...</p></div>}

      {/* Card */}
      {currentCard && (
        <div ref={cardContainerRef} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 min-h-[700px] flex flex-col animate-fade-in">
          {learningQueue.length > 1 && (
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-center gap-4">
              <span className="text-sm font-bold text-slate-500 uppercase">Learning ({queueIndex + 1} / {learningQueue.length})</span>
              <div className="w-40 h-2 bg-slate-300 rounded-full overflow-hidden"><div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${((queueIndex + 1) / learningQueue.length) * 100}%` }}></div></div>
            </div>
          )}
          
          <div className="flex flex-col h-full">
            <div className="flex flex-col lg:flex-row border-b border-slate-200">
               <div className="w-full lg:w-1/2 p-8 bg-slate-50 flex flex-col justify-center">
                  <h2 className="text-5xl font-bold text-slate-900 mb-2">{currentCard?.word || <Skeleton className="h-16 w-3/4" />}</h2>
                  <div className="flex flex-col gap-3 mb-6">
                    <div
                      onClick={() => { 
                        if (audioUsLoading) return;
                        setActiveAccent('US'); 
                        playAudio('US'); 
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${activeAccent === 'US' ? 'bg-white border-brand-300 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'} ${audioUsLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                       <span className="text-xs font-bold uppercase text-slate-400 min-w-[30px]">US</span>
                       {textLoading ? <Skeleton className="h-6 w-32" /> : <span className="font-mono text-sm">{currentCard?.phoneticUs || 'N/A'}</span>}
                    </div>
                    <div
                      onClick={() => { 
                        if (audioUkLoading) return;
                        setActiveAccent('UK'); 
                        playAudio('UK'); 
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${activeAccent === 'UK' ? 'bg-white border-brand-300 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'} ${audioUkLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                       <span className="text-xs font-bold uppercase text-slate-400 min-w-[30px]">UK</span>
                       {textLoading ? <Skeleton className="h-6 w-32" /> : <span className="font-mono text-sm">{currentCard?.phoneticUk || 'N/A'}</span>}
                    </div>
                  </div>
                  <div className="border-l-4 border-brand-500 pl-6 py-2">
                     {textLoading ? <div className="space-y-2"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-2/3" /></div> : <p className="text-slate-800 leading-relaxed text-lg font-medium font-serif">"{currentCard?.definition}"</p>}
                  </div>
                  <div className="mt-6 grid grid-cols-[80px_1fr] gap-y-3 text-base">
                      {textLoading ? <Skeleton className="h-10 w-full" /> : <>
                          {currentCard?.synonyms?.length && <><span className="font-bold text-slate-400 uppercase text-xs tracking-wider pt-1">Similar</span><div className="flex flex-wrap gap-2">{currentCard.synonyms.map(s => <span key={s} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-sm">{s}</span>)}</div></>}
                          {currentCard?.antonyms?.length && <><span className="font-bold text-slate-400 uppercase text-xs tracking-wider pt-1">Opposite</span><div className="flex flex-wrap gap-2">{currentCard.antonyms.map(a => <span key={a} className="bg-red-50 text-red-400 px-2 py-0.5 rounded text-sm">{a}</span>)}</div></>}
                      </>}
                  </div>
               </div>
               <div className="w-full lg:w-1/2 bg-slate-900 relative min-h-[400px] rounded-[2.5rem] overflow-hidden m-4 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-slate-500"><span className="text-3xl opacity-50">⏸️</span><span>Image Generation Paused</span></div>
               </div>
            </div>

            {step === 'visual' ? (
              <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white">
                 <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col h-full">
                   <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-brand-500"></span>Common Collocations (Fill in)</h4>
                   <div className="space-y-8 flex-1">
                     {textLoading ? Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                     : currentCard?.collocations?.slice(0, 5).map((item, i) => {
                       const phrase = typeof item === 'string' ? item : item.phrase;
                       const example = typeof item === 'string' ? '' : item.example;
                       const source = typeof item === 'string' ? '' : item.source;
                       const parts = example.split(new RegExp(`(${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                       return (
                         <div key={i} className="flex flex-col gap-2">
                           <div className="pl-1 mb-1">
                             <p className="text-slate-800 text-base leading-relaxed font-serif">"{parts.map((p,j) => p.toLowerCase() === phrase.toLowerCase() ? <span key={j} className="font-extrabold text-red-600 relative group cursor-help">{p}<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">Target Phrase</span></span> : p)}"</p>
                             {source && <p className="text-xs text-slate-400 mt-2 font-serif text-right tracking-wide">— {source}</p>}
                           </div>
                           <div className="flex items-center gap-3"><span className="text-slate-300 font-bold text-base w-5 text-right">{i+1}.</span><div className="relative w-full"><input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-base font-serif focus:ring-2 focus:ring-brand-500 placeholder:text-slate-300" placeholder={phrase.replace(new RegExp(`\\b${currentCard.word}\\b`, 'gi'), '____')}/></div></div>
                         </div>
                       );
                     })}
                   </div>
                 </div>

                 <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col h-full">
                    <div className="flex items-center justify-end mb-6">
                      <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold text-slate-500">
                         <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">Subject</span>
                         <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">Verb</span>
                         <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">Object</span>
                         <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">Comp</span>
                         <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">Adv</span>
                      </div>
                    </div>
                    <ul className="space-y-4 flex-1">
                      {textLoading ? Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                      : shuffledIndices.map((originalIndex) => <SentenceBuilder key={originalIndex} structure={currentCard?.structuredSentences?.[originalIndex] || { parts: [] }} index={originalIndex}/>)}
                    </ul>
                 </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
                 <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-800 text-center">Internalize "{currentCard?.word}"</h3>
                    <textarea className="w-full h-32 text-lg border-none focus:ring-0 resize-none placeholder:text-slate-300" placeholder={`I often feel ${currentCard?.word} when...`} value={userSentence} onChange={handleSentenceChange} autoFocus />
                    <div className="pt-4 border-t border-slate-100">
                       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tags</h4>
                       <div className="flex flex-wrap gap-2">
                          {tags.map(tag => <span key={tag} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm flex items-center gap-1">#{tag}<button onClick={() => handleRemoveTag(tag)} className="text-slate-400 hover:text-red-500">×</button></span>)}
                          <input type="text" className="bg-transparent border-none focus:ring-0 p-0 text-sm min-w-[100px]" placeholder="Add tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} />
                       </div>
                    </div>
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                       <div className="flex-1">{grammarFeedback && <div className={`text-sm ${grammarFeedback.valid ? 'text-green-600' : 'text-red-600'}`}>{grammarFeedback.text}</div>}</div>
                       <div className="flex gap-3"><Button variant="secondary" onClick={() => setStep('visual')}>Back</Button><Button onClick={grammarFeedback?.valid ? handleCompleteCard : handleCheckGrammar}>{grammarFeedback?.valid ? (isLastInQueue ? 'Save & Finish' : 'Save & Advance') : 'Check Grammar'}</Button></div>
                    </div>
                 </div>
              </div>
            )}
             {step === 'visual' && <div className="p-4 bg-white border-t border-slate-100 flex justify-end"><Button onClick={handleNextStep} className="px-8 py-3 text-base" disabled={textLoading}>I'm Ready to Use It →</Button></div>}
          </div>
        </div>
      )}
      {translation && (
        <div 
          className="fixed z-[100] bg-slate-900 text-white px-4 py-3 rounded-lg shadow-2xl text-sm max-w-sm pointer-events-none transform -translate-x-1/2 -translate-y-full" 
          style={{ left: translation.x, top: translation.y - 12 }}
        >
          {translating ? 'Translating...' : translation.text}
        </div>
      )}
      
      {/* Word Selection Popup Stack */}
      {wordStack.length > 0 && (
        <>
          <div 
            className="fixed inset-0 z-[90]" 
            onClick={() => {
              setWordStack([]);
              window.getSelection()?.removeAllRanges();
            }}
          />
          {wordStack.map((wordInfo, index) => {
            const isTopLayer = index === wordStack.length - 1;
            const depthFromTop = wordStack.length - 1 - index;
            
            // 优化的3D层叠效果：更自然的卡片堆叠
            const opacity = 1; // 所有层保持完全不透明，确保旧窗口单词清晰可见
            const blur = 0; // 取消模糊，保持所有层清晰
            const scale = isTopLayer ? 1 : Math.max(0.92, 1 - depthFromTop * 0.03);
            
            // 真正的卡片堆叠效果：所有窗口基于第一层位置累加
            const oldLayerHeight = 70; // 旧层标签高度（包含padding）
            // 从第二层开始，基于第一层的位置累加偏移
            const baseY = wordStack[0].y + 10; // 第一层的top位置
            const offsetY = index === 0 ? 0 : oldLayerHeight * index;
            const brightness = 1; // 所有层保持正常亮度
            
            return (
              <div 
                key={index}
                className="fixed rounded-xl shadow-2xl border-2 p-5 w-auto max-w-[90vw] transition-all duration-300 ease-out backdrop-blur-sm" 
                style={{ 
                  left: '50%',
                  top: baseY + offsetY,
                  transform: `translateX(-50%) scale(${scale})`,
                  zIndex: 100 + index,
                  opacity,
                  filter: `blur(${blur}px) brightness(${brightness})`,
                  transformOrigin: 'top center',
                  backgroundColor: isTopLayer ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0.88)',
                  borderColor: isTopLayer ? 'rgb(139, 92, 246)' : 'rgba(139, 92, 246, 0.5)',
                  backdropFilter: `blur(${isTopLayer ? 0 : 10}px)`,
                  boxShadow: isTopLayer 
                    ? '0 25px 50px -12px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.1), 0 10px 30px rgba(0, 0, 0, 0.15)' 
                    : `0 ${8 - depthFromTop}px ${16 - depthFromTop * 2}px -${3 + depthFromTop}px rgba(0, 0, 0, ${0.15 - depthFromTop * 0.02})`,
                  pointerEvents: isTopLayer ? 'auto' : 'all'
                }}
                onClick={(e) => {
                  if (!isTopLayer) {
                    e.stopPropagation();
                    setWordStack(prev => prev.slice(0, index + 1));
                  }
                }}
              >
              {/* 旧层只显示单词标题，像标签页 */}
              {!isTopLayer ? (
                <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 -m-5 p-5 rounded-xl transition-colors">
                  <p className="text-lg font-bold text-brand-700">{wordInfo.word}</p>
                  {!wordInfo.loading && (
                    <>
                      {/* 音标和发音按钮 */}
                      <div className="flex items-center gap-1.5">
                        {(wordInfo.phoneticUs || wordInfo.phoneticUk) && (
                          <>
                            <span className="text-xs text-slate-500 font-serif">
                              /{wordInfo.accent === 'US' ? wordInfo.phoneticUs : wordInfo.phoneticUk}/
                            </span>
                            {/* US/UK按钮 - 点击切换并播放 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // 计算新口音
                                const newAccent = wordInfo.accent === 'US' ? 'UK' : 'US';
                                // 先播放发音
                                playWordAudio(wordInfo.word, newAccent);
                                // 延迟更新状态，避免重复播放
                                setTimeout(() => {
                                  setWordStack(prev => {
                                    const newStack = [...prev];
                                    if (newStack[index]) {
                                      newStack[index] = { ...newStack[index], accent: newAccent };
                                    }
                                    return newStack;
                                  });
                                }, 50);
                              }}
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold transition-all bg-brand-600 text-white hover:bg-brand-700 hover:shadow-md cursor-pointer"
                              title={`点击切换到${wordInfo.accent === 'US' ? 'UK' : 'US'}并播放发音`}
                            >
                              🔊 {wordInfo.accent === 'US' ? 'US' : 'UK'}
                            </button>
                          </>
                        )}
                      </div>
                      {wordInfo.collins && wordInfo.collins > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                          {'★'.repeat(wordInfo.collins)}
                        </span>
                      )}
                    </>
                  )}
                  <span className="ml-auto text-xs text-slate-400">点击返回</span>
                </div>
              ) : (
                // 顶层显示完整内容
                <>
                  <div className="mb-3">
                    <div className="bg-slate-50/50 p-3 rounded-lg flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-xl font-bold text-brand-700">{wordInfo.word}</p>
                      {wordInfo.loading ? (
                        <div className="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
                      ) : (
                        <>
                          {/* 音标和发音按钮 */}
                          <div className="flex items-center gap-1.5">
                            {(wordInfo.phoneticUs || wordInfo.phoneticUk) && (
                              <>
                                <span className="text-xs text-slate-500 font-serif">
                                  /{wordInfo.accent === 'US' ? wordInfo.phoneticUs : wordInfo.phoneticUk}/
                                </span>
                                {/* US/UK按钮 - 点击切换并播放 */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // 计算新口音
                                    const newAccent = wordInfo.accent === 'US' ? 'UK' : 'US';
                                    // 先播放发音
                                    playWordAudio(wordInfo.word, newAccent);
                                    // 延迟更新状态，避免重复播放
                                    setTimeout(() => {
                                      setWordStack(prev => {
                                        const newStack = [...prev];
                                        const lastIndex = newStack.length - 1;
                                        if (lastIndex >= 0) {
                                          newStack[lastIndex] = { ...newStack[lastIndex], accent: newAccent };
                                        }
                                        return newStack;
                                      });
                                    }, 50);
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded font-semibold transition-all bg-brand-600 text-white hover:bg-brand-700 hover:shadow-md cursor-pointer"
                                  title={`点击切换到${wordInfo.accent === 'US' ? 'UK' : 'US'}并播放发音`}
                                >
                                  🔊 {wordInfo.accent === 'US' ? 'US' : 'UK'}
                                </button>
                              </>
                            )}
                          </div>
                          {wordInfo.collins && wordInfo.collins > 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                              {'★'.repeat(wordInfo.collins)}
                            </span>
                          )}
                          {wordInfo.oxford && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                              牛津3000
                            </span>
                          )}
                          {wordInfo.tag && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                              {getTagDescription(wordInfo.tag)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                {wordInfo.loading ? (
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-12 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-3 w-full bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                ) : (
                  <>
                    {/* 英文定义 */}
                    {wordInfo.definition && (
                      <div className="bg-slate-50/50 p-3 rounded-lg mb-2">
                        <p className="text-sm text-slate-700 leading-relaxed">{wordInfo.definition}</p>
                      </div>
                    )}
                    
                    {/* 近义词/反义词 */}
                    {(wordInfo.synonyms?.length || wordInfo.antonyms?.length) && (
                      <div className="space-y-2">
                        {wordInfo.synonyms?.length > 0 && (
                          <div className="bg-slate-50/50 p-3 rounded-lg">
                            <div className="flex items-start gap-2.5">
                              <span className="text-sm bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-semibold shrink-0">Synonyms:</span>
                              <div className="flex flex-wrap gap-2">
                                {wordInfo.synonyms.map((syn, i) => (
                                  <span 
                                    key={i} 
                                    className="text-sm bg-emerald-50 text-emerald-800 px-2 py-1 rounded cursor-pointer hover:bg-emerald-100 transition-colors"
                                    onDoubleClick={(e) => handleWordDoubleClick(syn, e)}
                                  >
                                    {syn}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {wordInfo.antonyms?.length > 0 && (
                          <div className="bg-slate-50/50 p-3 rounded-lg">
                            <div className="flex items-start gap-2.5">
                              <span className="text-sm bg-rose-50 text-rose-600 px-2 py-1 rounded font-semibold shrink-0">Antonyms:</span>
                              <div className="flex flex-wrap gap-2">
                                {wordInfo.antonyms.map((ant, i) => (
                                  <span 
                                    key={i} 
                                    className="text-sm bg-rose-50 text-rose-800 px-2 py-1 rounded cursor-pointer hover:bg-rose-100 transition-colors"
                                    onDoubleClick={(e) => handleWordDoubleClick(ant, e)}
                                  >
                                    {ant}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* 例句 */}
                    {wordInfo.examples && wordInfo.examples.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {wordInfo.examples.map((example, i) => (
                          <div key={i} className="bg-slate-50/50 p-3 rounded-lg">
                            <p 
                              className="text-sm text-slate-700 leading-relaxed mb-1.5 cursor-text select-text"
                              onDoubleClick={(e) => {
                                const selection = window.getSelection();
                                const word = selection?.toString().trim();
                                if (word && word.length > 0) {
                                  handleWordDoubleClick(word, e);
                                }
                              }}
                            >
                              "{example.sentence}"
                            </p>
                            <p className="text-[10px] text-slate-500">
                              — {example.source}
                              {example.year && ` (${example.year})`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* 词性 + 中文翻译（可折叠） */}
                    {(wordInfo.partOfSpeech || wordInfo.translation) && (
                      <div className="pt-2 border-t border-slate-100 mt-2">
                        <button
                          onClick={() => {
                            const updatedStack = [...wordStack];
                            const currentWord = updatedStack[updatedStack.length - 1];
                            currentWord.showTranslation = !currentWord.showTranslation;
                            setWordStack(updatedStack);
                          }}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <svg 
                            className={`w-4 h-4 transform transition-transform ${wordInfo.showTranslation ? 'rotate-0' : 'rotate-180'}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {wordInfo.showTranslation && (
                          <div className="bg-slate-50/50 p-3 rounded-lg mt-2">
                            <p className="text-xs leading-relaxed">
                              {wordInfo.partOfSpeech && (
                                <span className="text-slate-500 italic">{wordInfo.partOfSpeech}</span>
                              )}
                              {wordInfo.partOfSpeech && wordInfo.translation && (
                                <span className="text-slate-400 mx-1">:</span>
                              )}
                              {wordInfo.translation && (
                                <span className="font-bold text-slate-900">{wordInfo.translation}</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddToList}
                      className="flex-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-md hover:from-emerald-600 hover:to-teal-600 transition-all shadow-sm hover:shadow-md font-medium text-xs flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      加入列表
                    </button>
                    <button
                      onClick={handleStartLearning}
                      className="flex-1 px-3 py-1.5 bg-gradient-to-r from-brand-500 to-purple-500 text-white rounded-md hover:from-brand-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md font-medium text-xs flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      开始学习
                    </button>
                  </div>
                </>
              )}
            </div>
            );
          })}
        </>
      )}
    </div>
  );
};
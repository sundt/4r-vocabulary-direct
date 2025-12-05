
export enum AppModule {
  Learn = 'Learn',
  History = 'History'
}

export enum SRSLevel {
  New = 0,
  Step1 = 1, // 10m
  Step2 = 2, // 1d
  Step3 = 3, // 4d
  Step4 = 4, // 7d
  Mastered = 5 // 14d+
}

export interface CollocationDetail {
  phrase: string;
  example: string;
  source?: string; 
}

export interface SentencePart {
  text: string;
  role: 'subject' | 'verb' | 'object' | 'complement' | 'adverbial' | 'target' | 'other';
}

export interface StructuredSentence {
  parts: SentencePart[];
  source?: string;
}

export interface VocabCard {
  id: string;
  word: string;
  contextSentence?: string;
  
  phoneticUs?: string;
  phoneticUk?: string;
  
  audioUs?: string;
  audioUk?: string;
  audioBase64?: string; // Legacy/Fallback support
  
  definition: string;
  synonyms?: string[];
  antonyms?: string[];

  imageBase64?: string;
  
  collocations: (string | CollocationDetail)[]; 
  
  structuredSentences?: StructuredSentence[];
  sentenceTemplates?: string[]; 
  
  userSentence?: string;
  srsLevel: SRSLevel;
  nextReview: number;
  lastReviewed: number;
  tags?: string[];

  // FSRS fields
  easeFactor?: number;
  lapses?: number;
  interval?: number;
}

export interface WritingChallenge {
  id: string;
  topic: string;
  targetWords: string[];
  userText: string;
  feedback: string;
  timestamp: number;
}

export interface GeminiResponse<T> {
  data: T | null;
  error?: string;
}


import { GoogleGenAI } from "@google/genai";
import { VocabCard } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  return new GoogleGenAI({ apiKey });
};

const cleanAndParseJson = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    let cleaned = text.trim();
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```(json)?/g, '').replace(/```/g, '').trim();
    }
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;
    let end = -1;

    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      start = firstBracket;
      end = cleaned.lastIndexOf(']');
    } else if (firstBrace !== -1) {
      start = firstBrace;
      end = cleaned.lastIndexOf('}');
    }

    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error", e);
    return fallback;
  }
};

export const analyzeInputText = async (text: string): Promise<{word: string, context: string}[]> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze the input text. Identify vocabulary items suitable for learning.
    Rules:
    1. Extract target words found WITHIN the text.
    2. Do NOT suggest related words.
    3. Return JSON array of objects with "word" and "context".
    Text: "${text.substring(0, 2000)}..."`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { word: { type: 'STRING' }, context: { type: 'STRING' } }
        }
      }
    }
  });
  return cleanAndParseJson(response.text, []);
};

export const enrichVocabCard = async (word: string, context?: string): Promise<Partial<VocabCard>> => {
  const ai = getClient();
  const schema = {
    type: 'OBJECT',
    properties: {
      phoneticUs: { type: 'STRING', description: "IPA phonetic spelling for US English (e.g., /dɪˈrekt/)" },
      phoneticUk: { type: 'STRING', description: "IPA phonetic spelling for UK English (e.g., /dɪˈrekt/)" },
      definition: { type: 'STRING', description: "Conversational, Vocabulary.com style definition." },
      synonyms: { type: 'ARRAY', items: { type: 'STRING' } },
      antonyms: { type: 'ARRAY', items: { type: 'STRING' } },
      collocations: { 
        type: 'ARRAY', 
        description: "Exactly 5 common collocations with authentic examples.",
        items: { 
          type: 'OBJECT',
          properties: {
            phrase: { type: 'STRING' },
            example: { type: 'STRING' },
            source: { type: 'STRING' }
          },
          required: ['phrase', 'example']
        } 
      },
      structuredSentences: {
        type: 'ARRAY',
        description: "Exactly 5 sentences using the collocations, broken down grammatically.",
        items: {
          type: 'OBJECT',
          properties: {
            source: { type: 'STRING' },
            parts: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  text: { type: 'STRING' },
                  role: { 
                    type: 'STRING', 
                    enum: ['subject', 'verb', 'object', 'complement', 'adverbial', 'target', 'other']
                  }
                }
              }
            }
          }
        }
      }
    },
    required: ["phoneticUs", "phoneticUk", "definition", "synonyms", "antonyms", "collocations", "structuredSentences"]
  };

  let prompt = `Provide learning details for word: "${word}".`;
  if (context) prompt += `\nContext: "${context}".`;
  prompt += `\nGenerate 5 sentences using the identified collocations.
  Break down sentences into: Subject, Verb, Object, Complement, Adverbial, Target (the collocation phrase), Other.
  Include source citations (e.g. books, news) if possible.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema: schema }
  });

  return cleanAndParseJson(response.text, {});
};

export const generateVocabImage = async (word: string, definition: string): Promise<string | undefined> => {
  // Image generation is paused per user request
  return undefined;
};

export const generateVocabAudio = async (word: string, voice: 'US' | 'UK'): Promise<string | undefined> => {
  // Return a marker indicating Web Speech API should be used
  // No actual audio file generation needed
  return 'web-speech-api';
};

export const checkSentenceGrammar = async (word: string, sentence: string): Promise<{isValid: boolean, feedback: string, suggestions: string[]}> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Analyze sentence with target word "${word}": "${sentence}". 
    Return JSON: { "isValid": boolean, "feedback": string, "suggestions": string[] }`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: { isValid: { type: 'BOOLEAN' }, feedback: { type: 'STRING' }, suggestions: { type: 'ARRAY', items: { type: 'STRING' } } }
      }
    }
  });
  return cleanAndParseJson(response.text, {isValid: false, feedback: "Error", suggestions: []});
};

export const translateText = async (text: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Translate to Chinese (Simplified): "${text}"`
  });
  return response.text?.trim() || "Translation failed";
};

export const checkWritingChallenge = async (topic: string, text: string, targetWords: string[]): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Evaluate the user's short writing.
    Topic: ${topic}
    Target Words: ${targetWords.join(', ')}
    User Text: "${text}"
    
    Provide concise, constructive feedback on vocabulary usage and grammar.`
  });
  return response.text || "No feedback generated.";
};

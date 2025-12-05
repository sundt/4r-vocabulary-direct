import { VocabCard, WritingChallenge } from '../types';

const KEYS = {
  VOCAB: '4r_vocab_list',
  CHALLENGES: '4r_challenges'
};

// --- IndexedDB for Media Storage ---
const DB_NAME = '4r_media_db';
const STORE_NAME = 'assets';
const DB_VERSION = 1;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveMediaToDB = async (id: string, data: { image?: string, audioUs?: string, audioUk?: string }) => {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(data, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const getMediaFromDB = async (id: string): Promise<{ image?: string, audioUs?: string, audioUk?: string } | undefined> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// --- LocalStorage for Metadata ---

export const getVocabList = (): VocabCard[] => {
  try {
    const data = localStorage.getItem(KEYS.VOCAB);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load vocab metadata", e);
    return [];
  }
};

const saveVocabList = (list: VocabCard[]) => {
  try {
    // Strip heavy media fields before saving to LocalStorage
    const lightweightList = list.map(c => {
      // Destructure to remove heavy fields
      const { imageBase64, audioUs, audioUk, audioBase64, ...metadata } = c;
      return metadata;
    });
    localStorage.setItem(KEYS.VOCAB, JSON.stringify(lightweightList));
  } catch (e) {
    console.error("LocalStorage Quota Exceeded. Failed to save metadata.", e);
  }
};

export const saveVocabCard = async (card: VocabCard) => {
  // 1. Handle Media (IndexedDB)
  const { imageBase64, audioUs, audioUk, ...metadata } = card;
  const hasMedia = !!(imageBase64 || audioUs || audioUk);

  if (hasMedia) {
    try {
      const existingMedia = await getMediaFromDB(card.id) || {};
      await saveMediaToDB(card.id, {
        image: imageBase64 || existingMedia.image,
        audioUs: audioUs || existingMedia.audioUs,
        audioUk: audioUk || existingMedia.audioUk
      });
    } catch (e) {
      console.error("Failed to save media to IndexedDB", e);
    }
  }

  // 2. Handle Metadata (LocalStorage)
  const list = getVocabList();
  const index = list.findIndex(c => c.id === card.id);
  
  if (index >= 0) {
    list[index] = { ...list[index], ...metadata } as VocabCard;
  } else {
    list.push({ ...metadata } as VocabCard);
  }
  
  saveVocabList(list);
};

export const hydrateVocabCard = async (card: VocabCard): Promise<VocabCard> => {
  try {
    const media = await getMediaFromDB(card.id);
    if (media) {
      return {
        ...card,
        imageBase64: media.image,
        audioUs: media.audioUs,
        audioUk: media.audioUk
      };
    }
  } catch (e) {
    console.error("Failed to hydrate card media", e);
  }
  return card;
};

export const deleteVocabCard = async (id: string) => {
  // 1. Remove from LocalStorage
  const list = getVocabList();
  const newList = list.filter(c => c.id !== id);
  saveVocabList(newList);

  // 2. Remove from IndexedDB
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (e) {
    console.error("Failed to delete media from IndexedDB", e);
  }
};

// --- Challenges ---

export const getChallenges = (): WritingChallenge[] => {
  try {
    const data = localStorage.getItem(KEYS.CHALLENGES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveChallenge = (challenge: WritingChallenge) => {
  const list = getChallenges();
  const index = list.findIndex(c => c.id === challenge.id);
  if (index >= 0) {
    list[index] = challenge;
  } else {
    list.push(challenge);
  }
  localStorage.setItem(KEYS.CHALLENGES, JSON.stringify(list));
};

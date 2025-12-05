
import React, { useState, useEffect } from 'react';
import { getVocabList, hydrateVocabCard, deleteVocabCard } from '../services/storageService';
import { VocabCard } from '../types';
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

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const formatDateGroup = (timestamp: number) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

interface HistoryModuleProps {
  onRelearn: (word: VocabCard) => void;
}

export const HistoryModule: React.FC<HistoryModuleProps> = ({ onRelearn }) => {
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Record<string, VocabCard[]>>({});
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedCard, setSelectedCard] = useState<VocabCard | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    const list = getVocabList().sort((a, b) => b.lastReviewed - a.lastReviewed);
    setCards(list);
    
    // Extract unique tags
    const tags = new Set<string>();
    list.forEach(c => c.tags?.forEach(t => tags.add(t)));
    setAllTags(Array.from(tags).sort());
  }, []);

  useEffect(() => {
    let result = cards;
    if (search.trim()) {
      const lower = search.toLowerCase();
      result = result.filter(c => c.word.toLowerCase().includes(lower));
    }
    if (selectedTag) {
      result = result.filter(c => c.tags?.includes(selectedTag));
    }

    // Group by Date
    const groups: Record<string, VocabCard[]> = {};
    result.forEach(card => {
      const group = formatDateGroup(card.lastReviewed || Date.now());
      if (!groups[group]) groups[group] = [];
      groups[group].push(card);
    });
    setFilteredGroups(groups);
  }, [search, selectedTag, cards]);

  const handleCardClick = async (card: VocabCard) => {
    const fullCard = await hydrateVocabCard(card);
    setSelectedCard(fullCard);
  };

  const handleDelete = async () => {
    if (!selectedCard) return;
    if (confirm(`Delete "${selectedCard.word}"?`)) {
      await deleteVocabCard(selectedCard.id);
      setCards(prev => prev.filter(c => c.id !== selectedCard.id));
      setSelectedCard(null);
    }
  };

  const playAudio = async (accent: 'US' | 'UK') => {
    if (!selectedCard) return;
    const audioData = accent === 'US' ? selectedCard.audioUs : selectedCard.audioUk;
    if (!audioData) return;
    try {
      let ctx = audioContext;
      if (!ctx) {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        setAudioContext(ctx);
      }
      if (ctx.state === 'suspended') await ctx.resume();
      const pcmBytes = decode(audioData);
      const audioBuffer = await decodeAudioData(pcmBytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-fade-in space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-slate-200 pb-6">
        <div>
           <h2 className="text-3xl font-bold text-slate-900 mb-2">Vocabulary History</h2>
           <div className="flex flex-wrap gap-2">
             <button onClick={() => setSelectedTag(null)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${!selectedTag ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>All</button>
             {allTags.map(tag => (
               <button key={tag} onClick={() => setSelectedTag(tag === selectedTag ? null : tag)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${tag === selectedTag ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>#{tag}</button>
             ))}
           </div>
        </div>
        <div className="w-full md:w-64 relative">
           <input type="text" className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
           <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      <div className="space-y-8">
        {Object.keys(filteredGroups).length === 0 ? <div className="text-center py-20 text-slate-400">No words found.</div> : 
         Object.keys(filteredGroups).map(date => (
           <div key={date}>
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">{date}</h3>
             <div className="flex flex-wrap gap-3">
               {filteredGroups[date].map(card => (
                 <button key={card.id} onClick={() => handleCardClick(card)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-brand-300 hover:shadow-md transition-all text-slate-700 font-medium text-lg">{card.word}</button>
               ))}
             </div>
           </div>
         ))}
      </div>

      {selectedCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedCard(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
             <div className="h-32 bg-brand-600 relative flex items-center justify-center">
                 <h2 className="text-4xl font-bold text-white">{selectedCard.word}</h2>
                 <button onClick={() => setSelectedCard(null)} className="absolute top-4 right-4 text-white/70 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="p-8 space-y-6">
                <div className="flex gap-4">
                  <button onClick={() => playAudio('US')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600"><span className="font-mono text-base whitespace-nowrap">US: {selectedCard.phoneticUs}</span> 🔊</button>
                  <button onClick={() => playAudio('UK')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600"><span className="font-mono text-base whitespace-nowrap">UK: {selectedCard.phoneticUk}</span> 🔊</button>
                </div>
                <div><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Definition</h4><p className="text-xl text-slate-800 font-serif leading-relaxed">"{selectedCard.definition}"</p></div>
                <div className="bg-brand-50 p-4 rounded-xl border border-brand-100"><h4 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">My Sentence</h4><p className="text-brand-900 text-lg italic">"{selectedCard.userSentence || 'None'}"</p></div>
                {selectedCard.tags && <div className="flex gap-2">{selectedCard.tags.map(t => <span key={t} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm">#{t}</span>)}</div>}
             </div>
             <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
                <Button variant="danger" onClick={handleDelete} className="bg-white border-red-200 text-red-600 hover:bg-red-50">Delete</Button>
                <div className="flex gap-3">
                   <Button variant="secondary" onClick={() => setSelectedCard(null)}>Close</Button>
                   <Button onClick={() => { onRelearn(selectedCard); setSelectedCard(null); }}>Re-learn This Word</Button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

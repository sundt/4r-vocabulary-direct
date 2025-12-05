
import React, { useState, useEffect, useRef } from 'react';
import { VocabCard, SRSLevel } from '../types';
import { getVocabList, saveVocabCard, hydrateVocabCard } from '../services/storageService';
import { Button } from './Button';

interface Props {
  onBack: () => void;
}

// Helper: Levenshtein Distance for Fuzzy Matching (C.5)
const getEditDistance = (a: string, b: string) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export const ReviewModule: React.FC<Props> = ({ onBack }) => {
  // Queue & Data State
  const [reviews, setReviews] = useState<VocabCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState<VocabCard | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Interaction State
  const [phase, setPhase] = useState<'recall' | 'feedback'>('recall');
  const [userGuess, setUserGuess] = useState('');
  const [hintLevel, setHintLevel] = useState(0); // 0=None, 1=Letter, 2=POS/Phone, 3=Synonym, 4=Fail
  const [isLeech, setIsLeech] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{text: string, type: 'success'|'warning'|'error'} | null>(null);

  // Audio state
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    const list = getVocabList();
    const now = Date.now();
    // Filter for cards due for review (and not New)
    const due = list.filter(card => card.srsLevel > SRSLevel.New && card.nextReview <= now);
    // Sort by priority (overdue first)
    due.sort((a, b) => a.nextReview - b.nextReview);
    setReviews(due);
  }, []);

  useEffect(() => {
    const loadCard = async () => {
      if (reviews.length > 0 && currentIndex < reviews.length) {
        setLoadingMedia(true);
        const rawCard = reviews[currentIndex];
        const hydrated = await hydrateVocabCard(rawCard);
        
        // Initialize FSRS fields if missing
        if (!hydrated.easeFactor) hydrated.easeFactor = 2.5;
        if (!hydrated.lapses) hydrated.lapses = 0;
        if (!hydrated.interval) hydrated.interval = 0;

        setCurrentCard(hydrated);
        
        // C.4 Leech Detection
        if ((hydrated.lapses || 0) >= 5) {
          setIsLeech(true);
        } else {
          setIsLeech(false);
        }

        setLoadingMedia(false);
        resetInteraction();
      } else {
        setCurrentCard(null);
      }
    };
    loadCard();
  }, [currentIndex, reviews]);

  const resetInteraction = () => {
    setPhase('recall');
    setUserGuess('');
    setHintLevel(0);
    setFeedbackMsg(null);
  };

  // --- C.2 Progressive Hint System ---
  const handleHint = () => {
    if (hintLevel < 4) {
      setHintLevel(prev => prev + 1);
    }
    // If max hint reached, effectively reveal answer
    if (hintLevel === 3) {
      setPhase('feedback');
    }
  };

  const getHintContent = () => {
    if (!currentCard) return null;
    
    switch (hintLevel) {
      case 1:
        return (
          <div className="text-brand-200 font-mono text-xl animate-fade-in">
             Starts with: <span className="font-bold text-white text-3xl">{currentCard.word.charAt(0).toUpperCase()}...</span>
          </div>
        );
      case 2:
        return (
          <div className="text-brand-200 animate-fade-in space-y-2">
             <div className="font-mono text-xl">Starts with: <span className="font-bold text-white">{currentCard.word.charAt(0).toUpperCase()}...</span></div>
             <div className="flex gap-4 justify-center items-center text-sm">
                <span className="bg-white/10 px-2 py-1 rounded">US: {currentCard.phoneticUs}</span>
                <span className="bg-white/10 px-2 py-1 rounded">UK: {currentCard.phoneticUk}</span>
             </div>
          </div>
        );
      case 3:
        return (
          <div className="text-brand-200 animate-fade-in space-y-2">
             <div className="font-mono text-xl">Starts with: <span className="font-bold text-white">{currentCard.word.charAt(0).toUpperCase()}...</span></div>
             <div className="text-sm opacity-80">Phonetics revealed</div>
             {currentCard.synonyms && currentCard.synonyms.length > 0 && (
               <div className="bg-brand-900/50 p-3 rounded-lg border border-brand-500/30">
                 <span className="text-xs uppercase font-bold text-brand-400">Synonyms</span>
                 <div className="flex flex-wrap gap-2 mt-1 justify-center">
                   {currentCard.synonyms.map(s => <span key={s} className="text-white bg-brand-500/20 px-2 py-0.5 rounded">{s}</span>)}
                 </div>
               </div>
             )}
          </div>
        );
      default:
        return null;
    }
  };

  const handleCheck = () => {
    if (!currentCard) return;

    const target = currentCard.word.trim().toLowerCase();
    const input = userGuess.trim().toLowerCase();
    
    if (input === target) {
      // Perfect Match
      setFeedbackMsg({ text: "Perfect!", type: 'success' });
      setPhase('feedback');
      playAudio('US');
    } else {
      // C.5 Fuzzy Spelling Check
      const distance = getEditDistance(target, input);
      const isLongWord = target.length >= 7;
      
      if (isLongWord && distance <= 1) {
        setFeedbackMsg({ text: `Close enough! Correct: ${currentCard.word}`, type: 'warning' });
        setPhase('feedback');
        playAudio('US');
      } else {
        // Wrong
        const card = document.getElementById('review-card');
        card?.classList.add('animate-shake');
        setTimeout(() => card?.classList.remove('animate-shake'), 500);
        setFeedbackMsg({ text: "Incorrect, try a hint?", type: 'error' });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (phase === 'recall') handleCheck();
    }
  };

  // --- C.3 4-Level Feedback Mechanism ---
  const handleRate = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;
    
    // Apply Hint Penalty (C.2) - If hints were used, we downgrade the effective rating logic
    // or we simply trust the user's judgment but 'Easy' shouldn't be possible if they used 3 hints.
    let effectiveRating = rating;
    if (hintLevel >= 3 && rating === 'easy') effectiveRating = 'good';
    if (hintLevel >= 4 && rating !== 'again') effectiveRating = 'again';

    // FSRS Math (Simplified Implementation of C.3 Specs)
    let multiplier = 0;
    let nextIntervalMs = 0;
    let newLapses = currentCard.lapses || 0;
    let newEase = currentCard.easeFactor || 2.5;

    // Base interval: If it was 0 (New/Reset), start at 10m or 1d depending on rating
    const currentInterval = currentCard.interval || (10 * 60 * 1000); 

    switch (effectiveRating) {
      case 'again': 
        multiplier = 0;
        nextIntervalMs = 10 * 60 * 1000; // 10 minutes
        newLapses += 1;
        newEase = Math.max(1.3, newEase - 0.2); // Penalty
        break;
      case 'hard':
        multiplier = 1.2;
        nextIntervalMs = Math.max(currentInterval * 1.2, 24 * 60 * 60 * 1000); // Min 1 day
        newEase = Math.max(1.3, newEase - 0.15);
        break;
      case 'good':
        multiplier = 2.5;
        nextIntervalMs = Math.max(currentInterval * 2.5, 24 * 60 * 60 * 1000);
        // Stability unchanged or slight boost
        break;
      case 'easy':
        multiplier = 4.0;
        nextIntervalMs = Math.max(currentInterval * 4.0, 4 * 24 * 60 * 60 * 1000); // Min 4 days
        newEase += 0.15;
        break;
    }

    // Leech Logic (C.4) - If failed too many times
    if (newLapses >= 5) {
      if (confirm(`You've struggled with "${currentCard.word}" 5 times. It's a "Leech".\n\nDo you want to re-learn it (edit image/sentence)?`)) {
         // In a real app, route to edit. Here we might just reset it fully or alert.
         // For now, let's keep it simple: Reset lapses if they agree to "re-learn" mentally
         newLapses = 0;
      }
    }

    const updated: VocabCard = {
      ...currentCard,
      srsLevel: effectiveRating === 'again' ? SRSLevel.Step1 : Math.min(SRSLevel.Mastered, currentCard.srsLevel + 1), // Rough mapping to old level system for UI compatibility
      nextReview: Date.now() + nextIntervalMs,
      lastReviewed: Date.now(),
      interval: nextIntervalMs,
      easeFactor: newEase,
      lapses: newLapses
    };

    await saveVocabCard(updated);

    if (currentIndex < reviews.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setReviews([]); // Done
    }
  };

  // Audio Helper
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

  const playAudio = async (accent: 'US' | 'UK') => {
    if (!currentCard) return;
    const audioData = accent === 'US' ? (currentCard.audioUs || currentCard.audioBase64) : currentCard.audioUk;
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
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in max-w-lg mx-auto">
        <div className="inline-block p-6 rounded-full bg-green-50 text-green-600 mb-6 border border-green-100 shadow-sm">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-3xl font-bold text-slate-800 mb-2">Session Complete!</h3>
        <p className="text-slate-500 mt-2 text-lg">You have reviewed all due cards.</p>
        <div className="mt-8 flex justify-center">
           <Button onClick={onBack} variant="primary" className="px-8 py-3">Back to Learning</Button>
        </div>
      </div>
    );
  }

  if (!currentCard || loadingMedia) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mx-auto mb-4"></div>
        <p className="text-slate-400 font-medium">Loading FSRS Engine...</p>
      </div>
    );
  }

  // C.4 Leech Warning Banner
  const leechWarning = isLeech ? (
    <div className="bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full mb-4 inline-block border border-red-100">
      ⚠️ Leech Word (Hard to remember)
    </div>
  ) : null;

  return (
    <div className="max-w-4xl mx-auto py-4 min-h-[600px] flex flex-col">
      {/* Top Bar */}
      <div className="mb-4 flex justify-between items-center text-slate-400 text-sm font-bold uppercase tracking-wider">
        <span>FSRS Review</span>
        <div className="flex items-center gap-3">
          <span className="text-brand-500">{currentIndex + 1}</span>
          <span className="w-px h-4 bg-slate-300"></span>
          <span>{reviews.length}</span>
        </div>
      </div>

      {/* Main Card */}
      <div id="review-card" className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex-1 flex flex-col relative transition-transform">
        
        {/* C.1 Immersive Visual Trigger */}
        <div className="relative h-[350px] bg-slate-900 overflow-hidden group">
          {currentCard.imageBase64 ? (
             <img 
               src={currentCard.imageBase64} 
               alt="Visual Cue" 
               className={`w-full h-full object-cover transition-all duration-700 ${phase === 'feedback' ? 'opacity-30 blur-sm scale-105' : 'opacity-100'}`} 
             />
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">No Image Cue</div>
           )}
           
           {/* Overlay Context */}
           <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 text-center">
              {leechWarning}
              {/* C.1 Context Trigger (Cloze Sentence) */}
              {currentCard.userSentence ? (
                <div className="text-2xl md:text-3xl font-medium text-white leading-relaxed drop-shadow-md">
                   "{currentCard.userSentence.replace(new RegExp(currentCard.word, 'gi'), '_______')}"
                </div>
              ) : (
                <div className="text-xl text-slate-300 italic">No context sentence available.</div>
              )}
              {/* Definition Trigger (Secondary) */}
              <div className="mt-4 text-slate-400 font-serif italic text-lg opacity-80">
                 "{currentCard.definition}"
              </div>
           </div>
        </div>

        {/* Interaction Area */}
        <div className="flex-1 bg-white p-8 flex flex-col items-center justify-center">
           
           {phase === 'recall' ? (
             <div className="w-full max-w-md space-y-6 animate-fade-in">
                {/* Hints Area */}
                <div className="min-h-[60px] flex items-center justify-center bg-slate-900 rounded-xl border border-slate-700 p-4 shadow-inner">
                   {hintLevel === 0 ? (
                     <span className="text-slate-500 text-sm font-medium">Type the missing word</span>
                   ) : (
                     getHintContent()
                   )}
                </div>

                {/* Input Method */}
                <div className="relative">
                  <input 
                    type="text" 
                    className={`w-full p-4 text-center text-2xl font-bold bg-slate-50 border-2 rounded-xl focus:ring-0 outline-none transition-all shadow-sm ${
                      feedbackMsg?.type === 'error' ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 focus:border-brand-500 text-slate-800'
                    }`}
                    placeholder="Type here..."
                    value={userGuess}
                    onChange={(e) => {
                      setUserGuess(e.target.value);
                      if (feedbackMsg) setFeedbackMsg(null); // Clear error on type
                    }}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    autoComplete="off"
                  />
                  {feedbackMsg && feedbackMsg.type === 'error' && (
                     <div className="absolute -bottom-6 left-0 w-full text-center text-xs font-bold text-red-500 uppercase tracking-wide">
                        Incorrect
                     </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                   <Button variant="secondary" onClick={handleHint} disabled={hintLevel >= 4}>
                      {hintLevel === 0 ? 'Need a Hint?' : hintLevel >= 3 ? 'Give Up' : 'Next Hint'}
                   </Button>
                   <Button onClick={handleCheck} disabled={!userGuess}>
                      Check Answer
                   </Button>
                </div>
                
                {hintLevel > 0 && (
                  <p className="text-center text-xs text-slate-400">
                    Hint usage lowers recall quality score.
                  </p>
                )}
             </div>
           ) : (
             <div className="w-full max-w-2xl animate-fade-in flex flex-col items-center">
                {/* Result Display */}
                <div className="text-center mb-10">
                   <div className="flex items-center justify-center gap-2 mb-2">
                      {feedbackMsg?.type === 'success' && <span className="text-green-500 text-2xl">✨</span>}
                      {feedbackMsg?.type === 'warning' && <span className="text-amber-500 text-2xl">⚠️</span>}
                      {feedbackMsg?.text && <span className={`font-bold ${feedbackMsg.type === 'success' ? 'text-green-600' : 'text-amber-600'}`}>{feedbackMsg.text}</span>}
                   </div>
                   
                   <h2 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6">{currentCard.word}</h2>
                   
                   <div className="flex gap-4 justify-center">
                      <button onClick={() => playAudio('US')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 rounded-full transition-colors font-medium">
                        🔊 US <span className="text-slate-400 font-normal">|</span> {currentCard.phoneticUs}
                      </button>
                      <button onClick={() => playAudio('UK')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 rounded-full transition-colors font-medium">
                        🔊 UK <span className="text-slate-400 font-normal">|</span> {currentCard.phoneticUk}
                      </button>
                   </div>
                </div>

                {/* C.3 4-Level Feedback Buttons */}
                <div className="grid grid-cols-4 gap-4 w-full">
                   <button onClick={() => handleRate('again')} className="flex flex-col items-center p-3 rounded-xl bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 hover:border-red-200 hover:scale-105 transition-all">
                      <span className="font-bold">Again</span>
                      <span className="text-xs opacity-70 mt-1">&lt; 10m</span>
                   </button>
                   
                   <button onClick={() => handleRate('hard')} className="flex flex-col items-center p-3 rounded-xl bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100 hover:border-orange-200 hover:scale-105 transition-all">
                      <span className="font-bold">Hard</span>
                      <span className="text-xs opacity-70 mt-1">x 1.2</span>
                   </button>
                   
                   <button onClick={() => handleRate('good')} className="flex flex-col items-center p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 hover:scale-105 transition-all">
                      <span className="font-bold">Good</span>
                      <span className="text-xs opacity-70 mt-1">x 2.5</span>
                   </button>
                   
                   <button 
                      onClick={() => handleRate('easy')} 
                      disabled={hintLevel > 1} // Disable Easy if hints used
                      className={`flex flex-col items-center p-3 rounded-xl border transition-all ${hintLevel > 1 ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-50' : 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100 hover:border-green-200 hover:scale-105'}`}
                   >
                      <span className="font-bold">Easy</span>
                      <span className="text-xs opacity-70 mt-1">x 4.0</span>
                   </button>
                </div>
                {hintLevel > 1 && <p className="text-xs text-slate-400 mt-4 text-center">"Easy" option disabled due to hint usage.</p>}

             </div>
           )}

        </div>
      </div>
    </div>
  );
};

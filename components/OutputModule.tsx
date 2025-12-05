import React, { useState, useEffect, useRef } from 'react';
import { getVocabList } from '../services/storageService';
import { checkWritingChallenge } from '../services/geminiService';
import { Button } from './Button';
import { SRSLevel } from '../types';

export const OutputModule: React.FC = () => {
  const [targetWords, setTargetWords] = useState<string[]>([]);
  const [userText, setUserText] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const shuffleWords = () => {
    // Pick 3 random words that are at least Step 1
    const list = getVocabList().filter(w => w.srsLevel > 0);
    const shuffled = list.sort(() => 0.5 - Math.random());
    setTargetWords(shuffled.slice(0, 3).map(w => w.word));
    setFeedback(null);
    setUserText('');
    setAudioUrl(null);
  };

  useEffect(() => {
    shuffleWords();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSubmit = async () => {
    if (!userText || targetWords.length === 0) return;
    setLoading(true);
    try {
      const result = await checkWritingChallenge("Daily Summary", userText, targetWords);
      setFeedback(result);
    } catch (e: any) {
      if (e.message?.includes('quota')) alert("API Quota Exceeded.");
      else alert("Feedback failed");
    } finally {
      setLoading(false);
    }
  };

  if (targetWords.length < 3) {
    return (
       <div className="text-center py-20 text-slate-500 max-w-lg mx-auto">
         <div className="bg-slate-100 p-8 rounded-2xl border border-slate-200">
           <p className="text-lg font-medium mb-4">Not enough vocabulary yet.</p>
           <p>You need to learn at least 3 words in the "Learn" module before you can start a writing challenge.</p>
         </div>
       </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-brand-500"></div>
        <div className="flex justify-between items-start mb-6">
          <div>
             <h2 className="text-2xl font-bold text-slate-900 mb-1">Micro-Writing Challenge</h2>
             <p className="text-slate-500">Connect the concepts. Write a short paragraph (50-80 words) using these words:</p>
          </div>
          <button onClick={shuffleWords} className="text-slate-400 hover:text-brand-600 transition-colors" title="Shuffle Words">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-2">
          {targetWords.map(w => (
             <span key={w} className="px-4 py-2 bg-brand-50 text-brand-700 font-bold rounded-lg border border-brand-100 shadow-sm text-lg">
               {w}
             </span>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
        <textarea 
          className="w-full h-48 p-4 text-lg border-0 focus:ring-0 resize-none placeholder:text-slate-300 text-slate-800"
          placeholder="Start writing here..."
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
        />
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
           <div className="flex items-center gap-3">
             {/* Audio Recording UI */}
             {!audioUrl ? (
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                    isRecording ? 'bg-red-50 text-red-600 animate-pulse border border-red-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <span className="w-3 h-3 bg-red-600 rounded-full"></span> 
                      <span>Stop Recording</span>
                    </>
                  ) : (
                    <>
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                       <span>Record Reading</span>
                    </>
                  )}
                </button>
             ) : (
               <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                  <button onClick={() => setAudioUrl(null)} className="text-green-400 hover:text-red-500 p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <audio src={audioUrl} controls className="h-8 w-48" />
               </div>
             )}
           </div>

           <Button onClick={handleSubmit} disabled={loading || !userText} isLoading={loading} className="px-6">
             Submit for Feedback
           </Button>
        </div>
      </div>

      {feedback && (
        <div className="bg-white p-8 rounded-2xl border border-brand-100 shadow-lg animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-indigo-500"></div>
          <h3 className="font-bold text-slate-900 mb-4 text-xl flex items-center gap-2">
            <span className="text-2xl">🤖</span> AI Feedback
          </h3>
          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line">
            {feedback}
          </div>
        </div>
      )}
    </div>
  );
};
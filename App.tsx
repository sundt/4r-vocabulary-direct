
import React, { useState } from 'react';
import { AppModule, VocabCard } from './types';
import { LearningModule } from './components/LearningModule';
import { HistoryModule } from './components/HistoryModule';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toast } from './components/Toast';

const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<AppModule>(AppModule.Learn);
  const [relearnQueue, setRelearnQueue] = useState<VocabCard[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleRelearn = (word: VocabCard) => {
    setRelearnQueue([word]);
    setCurrentModule(AppModule.Learn);
    setToastMessage(`Added "${word.word}" to Learning Queue`);
  };

  const renderModule = () => {
    switch (currentModule) {
      case AppModule.Learn:
        return <LearningModule relearnQueue={relearnQueue} />;
      case AppModule.History:
        return <HistoryModule onRelearn={handleRelearn} />;
      default:
        return <LearningModule />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentModule(AppModule.Learn)}>
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">4R</div>
            <h1 className="font-bold text-slate-800 hidden sm:block">Vocabulary Direct</h1>
          </div>
          
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setCurrentModule(AppModule.Learn)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentModule === AppModule.Learn ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              Learn
            </button>
            <button onClick={() => setCurrentModule(AppModule.History)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${currentModule === AppModule.History ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              History
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        <ErrorBoundary>{renderModule()}</ErrorBoundary>
      </main>
      
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
};
export default App;

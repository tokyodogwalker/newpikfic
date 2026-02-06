import React, { useState } from 'react';
import { AppState } from './types';
import { useAppConfig } from './hooks/useAppConfig';
import { useIdolData } from './hooks/useIdolData';
import { useStoryManager } from './hooks/useStoryManager';
import SetupView from './components/Views/SetupView';
import WritingView from './components/Views/WritingView';
import LibraryView from './components/Views/LibraryView';
import { ArrowUp, MessageSquare } from 'lucide-react';

const App: React.FC = () => {
  const { theme, setTheme, language, setLanguage } = useAppConfig();
  const { kpopGroups } = useIdolData(language);
  const { stories, currentStory, setCurrentStory, loading, setLoading, saveToLibrary, deleteFromLibrary } = useStoryManager();
  const [view, setView] = useState<AppState>(AppState.SETUP);

  const themeClasses = theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-black';
  const borderClasses = theme === 'dark' ? 'border-zinc-800' : 'border-black';
  const buttonActiveClasses = theme === 'dark' ? 'bg-zinc-100 text-zinc-950' : 'bg-black text-white';
  const buttonHoverClasses = theme === 'dark' ? 'hover:bg-zinc-900' : 'hover:bg-gray-100';

  return (
    <div className={`min-h-screen relative flex flex-col transition-colors duration-300 ${themeClasses}`}>
      {/* 플로팅 버튼 */}
      {view === AppState.WRITING ? (
        <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className={`fixed bottom-24 right-6 w-12 h-12 rounded-full border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} flex items-center justify-center z-[110] shadow-lg`}><ArrowUp size={20} /></button>
      ) : (
        <a href="https://spin-spin.com/jonnagal" target="_blank" rel="noopener noreferrer" className={`fixed bottom-24 right-6 w-12 h-12 rounded-full border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} flex items-center justify-center z-[110] shadow-lg`}><MessageSquare size={17} /></a>
      )}

      {/* 네비게이션 */}
      <nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} px-8 py-3 rounded-full flex items-center gap-12 z-[100] shadow-xl`}>
        <button onClick={() => setView(AppState.SETUP)} className={`flex flex-col items-center ${view === AppState.SETUP ? 'opacity-100 font-black' : 'opacity-30'}`}><span className="text-[10px] uppercase tracking-[0.2em]">Home</span></button>
        <button onClick={() => setView(AppState.LIBRARY)} className={`flex flex-col items-center ${view === AppState.LIBRARY ? 'opacity-100 font-black' : 'opacity-30'}`}><span className="text-[10px] uppercase tracking-[0.2em]">Library</span></button>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="flex flex-col items-center opacity-30"><span className="text-[10px] uppercase tracking-[0.2em]">{theme === 'light' ? 'Dark' : 'Light'}</span></button>
      </nav>

      <main className="flex-1">
        {view === AppState.SETUP && <SetupView kpopGroups={kpopGroups} language={language} setLanguage={setLanguage} theme={theme} setLoading={setLoading} loading={loading} setCurrentStory={setCurrentStory} setView={setView} borderClasses={borderClasses} buttonActiveClasses={buttonActiveClasses} buttonHoverClasses={buttonHoverClasses} />}
        {view === AppState.WRITING && currentStory && <WritingView currentStory={currentStory} setCurrentStory={setCurrentStory} loading={loading} setLoading={setLoading} saveToLibrary={saveToLibrary} theme={theme} setView={setView} borderClasses={borderClasses} buttonActiveClasses={buttonActiveClasses} buttonHoverClasses={buttonHoverClasses} />}
        {view === AppState.LIBRARY && <LibraryView stories={stories} setCurrentStory={setCurrentStory} setView={setView} deleteFromLibrary={deleteFromLibrary} theme={theme} borderClasses={borderClasses} buttonActiveClasses={buttonActiveClasses} buttonHoverClasses={buttonHoverClasses} />}
      </main>

      <footer className="w-full max-w-4xl mx-auto px-6 py-12 text-center text-[8px] text-gray-400 border-t border-zinc-100 dark:border-zinc-900 mb-20">
        <p>본 콘텐츠는 AI에 의해 생성된 픽션이며 실존 인물 및 단체와는 아무런 관련이 없습니다.</p>
      </footer>
    </div>
  );
};

export default App;
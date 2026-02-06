import React, { useRef } from 'react';
import { Story, AppState } from '../../types';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { generateEpisode } from '../../services/geminiService';
import { AdPlaceholder } from '../Layout/AdPlaceholder';

interface Props {
  currentStory: Story;
  setCurrentStory: (s: Story) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  saveToLibrary: (s: Story) => void;
  theme: string;
  setView: (v: AppState) => void;
  borderClasses: string;
  buttonActiveClasses: string;
  buttonHoverClasses: string;
}

const WritingView: React.FC<Props> = ({ currentStory, setCurrentStory, loading, setLoading, saveToLibrary, theme, setView, borderClasses, buttonActiveClasses, buttonHoverClasses }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const [customInput, setCustomInput] = React.useState('');
  const lastEp = currentStory.episodes[currentStory.episodes.length - 1];

  const handleNext = async (choice: string) => {
    setLoading(true);
    try {
      const nextEpNum = currentStory.episodes.length + 1;
      const nextEp = await generateEpisode(currentStory, choice, nextEpNum);
      const updated = { ...currentStory, episodes: [...currentStory.episodes, { episodeNumber: nextEpNum, content: nextEp.content, suggestions: nextEp.suggestions, userChoice: choice }], isCompleted: nextEpNum >= currentStory.totalEpisodes };
      setCurrentStory(updated);
      setCustomInput('');
      setTimeout(() => scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) { alert("다음 회차 생성에 실패했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col h-[calc(100vh-2rem)] animate-in fade-in relative">
      <div className="flex-1 relative overflow-hidden">
        <div ref={contentRef} className="h-full overflow-y-auto scrollbar-hide space-y-12 py-8 pb-32">
          <div className={`flex items-center justify-between border-b ${borderClasses} pb-6 mb-8`}>
            <div className="flex items-center gap-4">
              <button onClick={() => setView(AppState.SETUP)} className={`p-2 border ${borderClasses} rounded-8 ${buttonHoverClasses}`}><ChevronLeft size={20} /></button>
              <div className="overflow-hidden">
                <h2 className="font-black text-xl italic tracking-tighter truncate max-w-[200px] md:max-w-md">{currentStory.title}</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{currentStory.episodes.length} / {currentStory.totalEpisodes} EPISODES</p>
              </div>
            </div>
            <button onClick={() => saveToLibrary(currentStory)} className={`${buttonActiveClasses} px-5 py-2 rounded-8 text-[10px] font-black uppercase`}>SAVE</button>
          </div>
          <div className="max-w-2xl mx-auto space-y-24">
            {currentStory.episodes.map((ep, idx) => (
              <div key={idx} ref={idx === currentStory.episodes.length - 1 ? scrollAnchorRef : null} className="space-y-8 animate-in duration-1000">
                <div className="text-center py-2"><span className={`text-[10px] border ${borderClasses} px-4 py-1.5 font-bold uppercase tracking-widest rounded-full`}>Chapter {ep.episodeNumber}</span></div>
                <div className="serif-content text-l whitespace-pre-wrap leading-relaxed">{ep.content.replace(/<br\s*\/?>/gi, '\n')}</div>
              </div>
            ))}
          </div>
          {loading && (
            <div className="max-w-2xl mx-auto py-8 flex flex-col items-center gap-4">
              <AdPlaceholder theme={theme} borderClasses={borderClasses} />
              <Loader2 className="animate-spin" size={32} /><p className="text-sm font-bold text-gray-500 uppercase">Writing next chapter...</p>
            </div>
          )}
          {!currentStory.isCompleted && !loading && (
            <div className={`max-w-2xl mx-auto pt-32 border-t ${borderClasses} space-y-12`}>
              <AdPlaceholder theme={theme} borderClasses={borderClasses} />
              <div className="flex justify-center"><button onClick={() => saveToLibrary(currentStory)} className={`border ${borderClasses} px-5 py-3 rounded-8 text-xs font-black uppercase flex items-center gap-2 ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>내 서재에 저장</button></div>
              <div className="space-y-6">
                <h4 className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Selection</h4>
                <div className="space-y-2">
                  {lastEp.suggestions.map((s, idx) => (
                    <button key={idx} onClick={() => handleNext(s)} className={`w-full p-5 border ${borderClasses} text-sm text-left rounded-8 font-medium flex items-center gap-4 group ${theme === 'dark' ? 'hover:bg-zinc-100 hover:text-zinc-950' : 'hover:bg-black hover:text-white'}`}>
                      <span className={`text-[10px] font-black w-6 h-6 rounded-full border ${borderClasses} flex items-center justify-center group-hover:border-current`}>{idx + 1}</span>{s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input type="text" value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="당신만의 서사를 입력하세요..." className={`w-full bg-transparent border ${borderClasses} rounded-8 py-5 pl-6 pr-16 text-sm focus:outline-none`} />
                <button disabled={!customInput} onClick={() => handleNext(customInput)} className={`absolute right-2 top-2 bottom-2 px-4 ${buttonActiveClasses} rounded-[6px] disabled:opacity-20`}><ChevronRight size={20} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default WritingView;
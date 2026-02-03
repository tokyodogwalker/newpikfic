
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, Story, IdolGroup, IdolMember, Theme } from './types';
import { KPOP_GROUPS, EPISODE_OPTIONS } from './constants';
import { generateEpisode } from './services/geminiService';
import { ChevronLeft, ChevronRight, Save, Trash2, Loader2, X, Plus, MessageSquare, User, ArrowUp } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppState>(AppState.SETUP);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // Setup state
  const [leftGroup, setLeftGroup] = useState<IdolGroup | null>(null);
  const [leftMember, setLeftMember] = useState<IdolMember | null>(null);
  const [rightGroup, setRightGroup] = useState<IdolGroup | null>(null);
  const [rightMember, setRightMember] = useState<IdolMember | null>(null);
  
  // Nafes state
  const [isNafes, setIsNafes] = useState(false);
  const [nafesName, setNafesName] = useState('여주');

  const [extraMembers, setExtraMembers] = useState<{group: IdolGroup, member: IdolMember}[]>([]);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [tempExtraGroup, setTempExtraGroup] = useState<IdolGroup | null>(null);

  const [themeInput, setThemeInput] = useState('');
  const [episodeLimit, setEpisodeLimit] = useState(10);

  // Writing state
  const [customInput, setCustomInput] = useState('');

  // Max members limit
  const maxExtraLimit = useMemo(() => {
    return Math.max(...KPOP_GROUPS.map(g => g.members.length));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('pikfic_stories');
    if (saved) setStories(JSON.parse(saved));
    
    const savedTheme = localStorage.getItem('pikfic_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('pikfic_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const saveStories = (updated: Story[]) => {
    setStories(updated);
    localStorage.setItem('pikfic_stories', JSON.stringify(updated));
  };

  const handleStartStory = async () => {
    const rightCharName = isNafes ? nafesName : rightMember?.name;
    if (!leftMember || !rightCharName || !themeInput) return;

    setLoading(true);
    try {
      const initialStory: Story = {
        id: Date.now().toString(),
        title: `[${leftMember.name} X ${rightCharName}] 연재 중...`,
        groupName: Array.from(new Set([
          leftGroup?.name, 
          !isNafes ? rightGroup?.name : null, 
          ...extraMembers.map(em => em.group.name)
        ])).filter(Boolean).join(', '),
        leftMember: leftMember.name,
        rightMember: rightCharName,
        isNafes,
        nafesName: isNafes ? nafesName : undefined,
        theme: themeInput,
        totalEpisodes: episodeLimit,
        episodes: [],
        isCompleted: false,
        createdAt: Date.now(),
      };

      const firstEp = await generateEpisode(initialStory, themeInput, 1);
      
      const newStory: Story = {
        ...initialStory,
        title: firstEp.storyTitle || initialStory.title,
        episodes: [{
          episodeNumber: 1,
          content: firstEp.content,
          suggestions: firstEp.suggestions,
        }]
      };
      
      setCurrentStory(newStory);
      setView(AppState.WRITING);
    } catch (e) {
      alert("집필 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextEpisode = async (choice: string) => {
    if (!currentStory) return;

    setLoading(true);
    try {
      const nextEpNum = currentStory.episodes.length + 1;
      const nextEp = await generateEpisode(currentStory, choice, nextEpNum);
      
      const updatedStory = {
        ...currentStory,
        episodes: [
          ...currentStory.episodes,
          {
            episodeNumber: nextEpNum,
            content: nextEp.content,
            suggestions: nextEp.suggestions,
            userChoice: choice,
          }
        ],
        isCompleted: nextEpNum >= currentStory.totalEpisodes
      };

      setCurrentStory(updatedStory);
      setCustomInput('');
      
      // Auto-scroll logic: scroll to the start of the new chapter
      setTimeout(() => {
        scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e) {
      alert("다음 회차 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const saveToLibrary = () => {
    if (!currentStory) return;
    const currentStories = JSON.parse(localStorage.getItem('pikfic_stories') || '[]');
    const existingIdx = currentStories.findIndex((s: Story) => s.id === currentStory.id);
    let updated;
    if (existingIdx >= 0) {
      updated = [...currentStories];
      updated[existingIdx] = currentStory;
    } else {
      updated = [currentStory, ...currentStories];
    }
    saveStories(updated);
    alert("서재에 안전하게 저장되었습니다.");
  };

  const deleteFromLibrary = (id: string) => {
    if (confirm("이 기록을 삭제하시겠습니까?")) {
      saveStories(stories.filter(s => s.id !== id));
    }
  };

  const addExtraMember = (member: IdolMember) => {
    if (tempExtraGroup && extraMembers.length < maxExtraLimit) {
      setExtraMembers([...extraMembers, { group: tempExtraGroup, member }]);
      setIsAddingExtra(false);
      setTempExtraGroup(null);
    }
  };

  const removeExtraMember = (idx: number) => {
    setExtraMembers(extraMembers.filter((_, i) => i !== idx));
  };

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const themeClasses = theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-black';
  const borderClasses = theme === 'dark' ? 'border-zinc-800' : 'border-black';
  const buttonActiveClasses = theme === 'dark' ? 'bg-zinc-100 text-zinc-950' : 'bg-black text-white';
  const buttonHoverClasses = theme === 'dark' ? 'hover:bg-zinc-900' : 'hover:bg-gray-100';

  const AdPlaceholder = () => (
    <div className={`w-full h-40 border ${borderClasses} rounded-8 flex items-center justify-center ${theme === 'dark' ? 'bg-zinc-900' : 'bg-gray-50'} mb-8 overflow-hidden relative group`}>
      <div className="text-center p-4">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sponsored</p>
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">PIKFIC Premium을 경험해보세요</p>
        <p className="text-xs text-gray-400 mt-2 italic">광고 노출 중... 잠시만 기다려주세요</p>
      </div>
      <div className="absolute top-2 right-2 cursor-pointer text-gray-300">
        <X size={14} />
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className={`max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in duration-700 pb-24 ${themeClasses}`}>
      <header className="text-center pt-8">
        <img src="/pikficlogo.png" alt="PIKFIC Logo" className="mx-auto w-full max-w-[250px] h-auto mb-4" />
        <p className="font-bold uppercase tracking-[0.2em] text-[10px] opacity-70">마이너도 크오도 성실하게 글 써드립니다🤓☝️</p>
        <p className="font-bold uppercase tracking-[0.2em] text-[10px] opacity-70">🔧TEST중🔧 사용하다가 불편한 점 스핀이나 디엠주세요.</p>
        <p className="font-bold uppercase tracking-[0.2em] text-[10px] opacity-70">무료토큰 다 쓰면 집필 실패 떠요ㄷㄷ 기다렸다가 나중에ㄱㄱ</p>
      </header>

      <section className={`space-y-10 border-t ${borderClasses} pt-10`}>
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full border ${borderClasses} flex items-center justify-center text-xs font-bold`}>01</span>
            <h2 className="text-sm font-bold uppercase tracking-widest">왼쪽 멤버👈👈</h2>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1">
            {KPOP_GROUPS.map(group => (
              <button
                key={`lg-${group.id}`}
                onClick={() => { setLeftGroup(group); setLeftMember(null); }}
                className={`p-2 text-[10px] font-bold border ${borderClasses} transition-all ${leftGroup?.id === group.id ? buttonActiveClasses : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}
              >
                {group.name}
              </button>
            ))}
          </div>
          {leftGroup && (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-1 animate-in slide-in-from-top-2">
              {leftGroup.members.map(member => (
                <button
                  key={`lm-${member.id}`}
                  onClick={() => setLeftMember(member)}
                  className={`p-3 text-xs border ${borderClasses} transition-all ${leftMember?.id === member.id ? `${buttonActiveClasses} font-bold` : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}
                >
                  {member.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full border ${borderClasses} flex items-center justify-center text-xs font-bold`}>02</span>
              <h2 className="text-sm font-bold uppercase tracking-widest">오른쪽 멤버👉👉</h2>
            </div>
            <button 
              onClick={() => setIsNafes(!isNafes)}
              className={`flex items-center gap-2 px-4 py-2 border ${borderClasses} rounded-full text-[10px] font-bold transition-all ${isNafes ? buttonActiveClasses : buttonHoverClasses}`}
            >
              🙋‍♀️ 저요저요 {isNafes ? 'ON' : 'OFF'}
            </button>
          </div>
          
          {isNafes ? (
            <div className="animate-in slide-in-from-top-2 space-y-4">
              <div className={`p-6 border border-dashed ${borderClasses} rounded-8 bg-transparent`}>
                <p className="text-xs font-bold mb-3 opacity-60 uppercase tracking-widest">이름 또는 애칭, 글에 녹이고 싶은 특징(나이, 성격, MBTI)들을 적어주세요</p>
                <input 
                  type="text" 
                  value={nafesName}
                  onChange={(e) => setNafesName(e.target.value)}
                  placeholder="예: 여주, 이름"
                  className={`w-full p-4 border ${borderClasses} rounded-8 text-sm focus:outline-none bg-transparent`}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1">
                {KPOP_GROUPS.map(group => (
                  <button
                    key={`rg-${group.id}`}
                    onClick={() => { setRightGroup(group); setRightMember(null); }}
                    className={`p-2 text-[10px] font-bold border ${borderClasses} transition-all ${rightGroup?.id === group.id ? buttonActiveClasses : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
              {rightGroup && (
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-1 animate-in slide-in-from-top-2">
                  {rightGroup.members.map(member => (
                    <button
                      key={`rm-${member.id}`}
                      onClick={() => setRightMember(member)}
                      className={`p-3 text-xs border ${borderClasses} transition-all ${rightMember?.id === member.id ? `${buttonActiveClasses} font-bold` : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="pt-2">
            <div className="flex flex-wrap items-center gap-2 min-h-[40px]">
              {extraMembers.map((em, idx) => (
                <div key={idx} className={`flex items-center gap-2 border ${borderClasses} px-3 py-1.5 text-xs font-bold rounded-full ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} group animate-in zoom-in-90`}>
                  <span className="text-[9px] opacity-40 uppercase tracking-tighter">{em.group.name}</span>
                  {em.member.name}
                  <button onClick={() => removeExtraMember(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
              {extraMembers.length < maxExtraLimit && (
                <button 
                  onClick={() => setIsAddingExtra(!isAddingExtra)}
                  className={`w-9 h-9 rounded-full border ${borderClasses} border-dashed flex items-center justify-center transition-all ${isAddingExtra ? buttonActiveClasses + ' rotate-45' : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}
                >
                  <Plus size={18} />
                </button>
              )}
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-2">등장인물 추가 ({extraMembers.length}/{maxExtraLimit})</span>
            </div>
            {isAddingExtra && (
              <div className={`mt-4 p-5 border ${borderClasses} border-dashed rounded-8 space-y-4 animate-in slide-in-from-top-4 ${theme === 'dark' ? 'bg-zinc-900/30' : 'bg-white'}`}>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1">
                  {KPOP_GROUPS.map(group => (
                    <button
                      key={`eg-${group.id}`}
                      onClick={() => setTempExtraGroup(group)}
                      className={`p-2 text-[10px] font-bold border ${borderClasses} transition-all ${tempExtraGroup?.id === group.id ? buttonActiveClasses : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
                {tempExtraGroup && (
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-1 animate-in slide-in-from-top-2">
                    {tempExtraGroup.members.map(member => (
                      <button
                        key={`em-${member.id}`}
                        onClick={() => addExtraMember(member)}
                        className={`p-3 text-xs border ${borderClasses} transition-all font-medium ${theme === 'dark' ? 'bg-zinc-800' : 'bg-white'} ${buttonHoverClasses}`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full border ${borderClasses} flex items-center justify-center text-xs font-bold`}>03</span>
              <h2 className="text-sm font-bold uppercase tracking-widest">주제 및 소재</h2>
            </div>
            <textarea
              placeholder="이야기의 전체적인 분위기, 소재, 시작점을 적어주세요..."
              className={`w-full h-32 border ${borderClasses} rounded-8 p-4 text-sm focus:outline-none placeholder:text-gray-300 bg-transparent`}
              value={themeInput}
              onChange={(e) => setThemeInput(e.target.value)}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full border ${borderClasses} flex items-center justify-center text-xs font-bold`}>04</span>
              <h2 className="text-sm font-bold uppercase tracking-widest">연재 분량</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EPISODE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setEpisodeLimit(opt)}
                  className={`py-3 text-xs font-bold border ${borderClasses} rounded-8 transition-all ${episodeLimit === opt ? buttonActiveClasses : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}
                >
                  {opt}회 분량
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={handleStartStory}
          disabled={!leftMember || (!isNafes && !rightMember) || !themeInput || loading}
          className={`w-full py-5 border ${borderClasses} ${buttonActiveClasses} font-black text-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 rounded-8`}
        >
          {loading ? <Loader2 className="animate-spin" /> : null}
          연재 시작하기
        </button>
      </section>
    </div>
  );

  const renderWriting = () => {
    if (!currentStory) return null;
    const lastEp = currentStory.episodes[currentStory.episodes.length - 1];

    return (
      <div className={`max-w-4xl mx-auto p-6 flex flex-col h-[calc(100vh-2rem)] animate-in fade-in relative ${themeClasses}`}>
        <div className="flex-1 relative overflow-hidden">
          <div ref={contentRef} className="h-full overflow-y-auto scrollbar-hide space-y-12 py-8 pb-32">
            <div className={`flex items-center justify-between border-b ${borderClasses} pb-6 mb-8`}>
              <div className="flex items-center gap-4">
                <button onClick={() => setView(AppState.SETUP)} className={`p-2 border ${borderClasses} rounded-8 ${buttonHoverClasses}`}>
                  <ChevronLeft size={20} />
                </button>
                <div className="overflow-hidden">
                  <h2 className="font-black text-xl uppercase italic tracking-tighter truncate max-w-[200px] md:max-w-md">
                    {currentStory.title}
                  </h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    {currentStory.episodes.length} / {currentStory.totalEpisodes} EPISODES
                  </p>
                </div>
              </div>
              <button 
                onClick={saveToLibrary} 
                className={`${buttonActiveClasses} px-5 py-2 rounded-8 text-[10px] font-black transition-all uppercase`}
              >
                SAVE
              </button>
            </div>

            <div className="max-w-2xl mx-auto space-y-24">
              {currentStory.episodes.map((ep, idx) => (
                <div 
                  key={idx} 
                  ref={idx === currentStory.episodes.length - 1 ? scrollAnchorRef : null}
                  className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000"
                >
                  <div className="text-center py-2">
                    <span className={`text-[10px] border ${borderClasses} px-4 py-1.5 font-bold uppercase tracking-widest rounded-full bg-inherit transition-all shadow-sm`}>
                      Chapter {ep.episodeNumber}
                    </span>
                  </div>
                  <div className={`serif-content text-l whitespace-pre-wrap leading-relaxed ${theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {ep.content}
                  </div>
                </div>
              ))}
            </div>

            {loading && (
              <div className="max-w-2xl mx-auto animate-in fade-in pt-24">
                <AdPlaceholder />
                <div className="flex flex-col items-center justify-center space-y-4 py-8">
                  <Loader2 className={`animate-spin ${theme === 'dark' ? 'text-zinc-100' : 'text-black'}`} size={32} />
                  <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Writing next chapter...</p>
                </div>
              </div>
            )}

            {!currentStory.isCompleted && !loading && (
              <div className={`max-w-2xl mx-auto pt-32 border-t ${borderClasses} space-y-12`}>
                {/* Restore Ad and Save Button before suggestions */}
                <AdPlaceholder />
                <div className="flex justify-center">
                  <button 
                    onClick={saveToLibrary}
                    className={`border ${borderClasses} px-5 py-3 rounded-8 text-xs font-black uppercase transition-all flex items-center gap-2 (${theme === 'dark' ? '255,255,255' : '0,0,0'},1)] ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}
                  >
                    내 서재에 저장
                  </button>
                </div>

                <div className="space-y-6">
                  <h4 className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Next Selection</h4>
                  <div className="space-y-2">
                    {lastEp.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleNextEpisode(s)}
                        className={`w-full p-5 border ${borderClasses} text-sm text-left transition-all rounded-8 font-medium flex items-center gap-4 group ${theme === 'dark' ? 'hover:bg-zinc-100 hover:text-zinc-950' : 'hover:bg-black hover:text-white'}`}
                      >
                        <span className={`text-[10px] font-black w-6 h-6 rounded-full border ${borderClasses} flex items-center justify-center group-hover:border-current`}>{idx + 1}</span>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="또는 당신만의 서사를 직접 입력하세요..."
                    className={`w-full bg-transparent border ${borderClasses} rounded-8 py-5 pl-6 pr-16 text-sm focus:outline-none placeholder:text-gray-300`}
                  />
                  <button
                    disabled={!customInput}
                    onClick={() => handleNextEpisode(customInput)}
                    className={`absolute right-2 top-2 bottom-2 px-4 ${buttonActiveClasses} rounded-[6px] transition-all disabled:opacity-20`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {currentStory.isCompleted && (
              <div className={`text-center py-20 border-t ${borderClasses} animate-in zoom-in-95`}>
                <h3 className="text-4xl font-black tracking-tighter italic mb-4">FIN.</h3>
                <p className="text-sm text-gray-500 uppercase tracking-widest mb-8">This story has reached its conclusion</p>
                <button onClick={() => setView(AppState.LIBRARY)} className={`border ${borderClasses} px-8 py-4 text-xs font-bold uppercase transition-all rounded-8 ${buttonHoverClasses}`}>
                  Go to Library
                </button>
              </div>
            )}
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t ${theme === 'dark' ? 'from-zinc-950' : 'from-white'} to-transparent pointer-events-none z-10`} />
        </div>
      </div>
    );
  };

  const renderLibrary = () => (
    <div className={`max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in pb-24 ${themeClasses}`}>
      <div className={`flex items-center justify-between border-b ${borderClasses} pb-8`}>
        <h1 className="text-4xl font-black tracking-tighter uppercase">Library</h1>
        <button onClick={() => setView(AppState.SETUP)} className={`flex items-center gap-1 border ${borderClasses} px-4 py-2 rounded-8 text-[10px] font-black uppercase transition-all ${buttonHoverClasses}`}>
          새 글 쓰기
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stories.length === 0 ? (
          <div className="col-span-full text-center py-32 border border-dashed border-gray-300 dark:border-zinc-700 rounded-8">
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No archives found</p>
          </div>
        ) : (
          stories.map(story => (
            <div key={story.id} className={`border ${borderClasses} rounded-8 p-6 transition-all flex flex-col justify-between ${theme === 'dark' ? 'bg-zinc-900/50' : 'bg-white'}`}>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight truncate w-full mb-1">{story.title}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">
                  {story.leftMember} x {story.rightMember} • {story.groupName}
                </p>
                <div className="text-[10px] text-gray-400 font-medium mb-8">
                  {story.episodes.length} EPISODES • {new Date(story.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setCurrentStory(story); setView(AppState.WRITING); }}
                  className={`flex-1 ${buttonActiveClasses} py-3 rounded-[6px] text-[10px] font-black uppercase transition-all hover:opacity-80`}
                >
                  Read Archive
                </button>
                <button
                  onClick={() => deleteFromLibrary(story.id)}
                  className={`p-3 border ${borderClasses} rounded-[6px] hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen relative flex flex-col transition-colors duration-300 ${themeClasses}`}>
      {/* Floating Button: Scroll Top in Writing, Suggestion in others */}
      {view === AppState.WRITING ? (
        <button 
          onClick={scrollToTop}
          className={`fixed bottom-24 right-6 w-12 h-12 rounded-full border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} flex items-center justify-center z-[110] shadow-lg group hover:scale-110 transition-all`}
        >
          <ArrowUp size={20} />
        </button>
      ) : (
        <a 
          href="https://spin-spin.com/jonnagal" 
          target="_blank" 
          rel="noopener noreferrer"
          className={`fixed bottom-24 right-6 w-12 h-12 rounded-full border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} flex items-center justify-center z-[110] shadow-lg group hover:scale-110 transition-all`}
        >
          <MessageSquare size={17} />
        </a>
      )}

      <nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} px-8 py-3 rounded-full flex items-center gap-12 z-[100] shadow-xl`}>
        <button onClick={() => setView(AppState.SETUP)} className={`flex flex-col items-center transition-all ${view === AppState.SETUP ? 'opacity-100 font-black' : 'opacity-30 hover:opacity-60'}`}>
          <span className="text-[10px] uppercase tracking-[0.2em]">Home</span>
        </button>
        <button onClick={() => setView(AppState.LIBRARY)} className={`flex flex-col items-center transition-all ${view === AppState.LIBRARY ? 'opacity-100 font-black' : 'opacity-30 hover:opacity-60'}`}>
          <span className="text-[10px] uppercase tracking-[0.2em]">Library</span>
        </button>
        <button 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
          className="flex flex-col items-center opacity-30 hover:opacity-100 transition-all"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </nav>

      <main className="flex-1">
        {view === AppState.SETUP && renderSetup()}
        {view === AppState.WRITING && renderWriting()}
        {view === AppState.LIBRARY && renderLibrary()}
      </main>

      <footer className="w-full max-w-4xl mx-auto px-6 py-12 text-center text-[8px] text-gray-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-900 mb-20">
        <p>
          본 콘텐츠는 AI에 의해 생성된 픽션이며 실존 인물 및 단체와는 아무런 관련이 없습니다.<br />
          모든 디지털 리터러시 책임은 사용자에게 있으며, 실존 인물에 대한 부적절한 활용은 금지됩니다.
        </p>
      </footer>
    </div>
  );
};

export default App;

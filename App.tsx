import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, Story, IdolGroup, IdolMember, Theme } from './types';
import { EPISODE_OPTIONS } from './constants'; // EPISODE_OPTIONS는 유지
import { generateEpisode } from './services/geminiService';
import { supabase } from './lib/supabase'; // Supabase 클라이언트 임포트
import { ChevronLeft, ChevronRight, Save, Trash2, Loader2, X, Plus, MessageSquare, User, ArrowUp, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<AppState>(AppState.SETUP);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguage] = useState<'kr' | 'en'>('kr'); // 글로벌 서비스 대비 다국어 상태
  
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // DB에서 불러온 그룹 데이터 상태
  const [kpopGroups, setKpopGroups] = useState<IdolGroup[]>([]);

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

  // 1. DB 데이터 페칭 (아이돌 정보 및 그룹)
  useEffect(() => {
    const fetchIdolData = async () => {
      const { data, error } = await supabase
        .from('idol_groups')
        .select(`
          id,
          group_name,
          group_name_en,
          idol_members (
            id,
            name_kr,
            name_en,
            personal_background,
            personal_traits
          )
        `);

      if (error) {
        console.error("Error fetching data:", error);
        return;
      }

      if (data) {
        // DB 데이터를 기존 IdolGroup/Member 인터페이스 형식으로 변환
        const formatted: IdolGroup[] = data.map((g: any) => ({
          id: g.id,
          name: language === 'kr' ? g.group_name : g.group_name_en,
          members: g.idol_members.map((m: any) => ({
            id: m.id,
            name: language === 'kr' ? m.name_kr : m.name_en,
            image: '', // 필요시 추가
            personality: `[Traits] ${m.personal_traits} [Background] ${m.personal_background}` // 고증 데이터 주입
          }))
        }));
        setKpopGroups(formatted);
      }
    };

    fetchIdolData();
  }, [language]); // 언어 변경 시 데이터 다시 로드

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
        // 중요: DB에서 가져온 고증 데이터를 story 객체에 포함시켜 geminiService로 전달
        leftMemberContext: leftMember.personality,
        rightMemberContext: !isNafes ? rightMember?.personality : undefined
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
      alert("집필 중 오류가 발생했습니다. 토큰 한도 초과이거나 DB 설정 문제일 수 있습니다.");
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
      
      setTimeout(() => {
        scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (e) {
      alert("다음 회차 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 나머지 기능(saveToLibrary, deleteFromLibrary 등)은 기존과 동일하게 유지
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
    const maxExtraLimit = 8; // 예시 리밋
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

  // UI 렌더링 함수들 (Setup, Writing, Library)
  // ... (기존과 거의 동일하되, KPOP_GROUPS 대신 kpopGroups 상태 사용)

  const renderSetup = () => (
    <div className={`max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in duration-700 pb-24 ${themeClasses}`}>
      <header className="text-center pt-8">
        <img src="/pikficlogo.png" alt="PIKFIC Logo" className="mx-auto w-full max-w-[250px] h-auto mb-4" />
        <div className="flex justify-center gap-4 mb-4">
           <button onClick={() => setLanguage('kr')} className={`text-[10px] font-bold ${language === 'kr' ? 'underline' : 'opacity-40'}`}>KOREAN</button>
           <button onClick={() => setLanguage('en')} className={`text-[10px] font-bold ${language === 'en' ? 'underline' : 'opacity-40'}`}>ENGLISH</button>
        </div>
      </header>

      <section className={`space-y-10 border-t ${borderClasses} pt-10`}>
        {/* Step 01: 왼쪽 멤버 */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full border ${borderClasses} flex items-center justify-center text-xs font-bold`}>01</span>
            <h2 className="text-sm font-bold uppercase tracking-widest">{language === 'kr' ? '왼쪽 멤버' : 'LEFT MEMBER'}👈</h2>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1">
            {kpopGroups.map(group => (
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

        {/* Step 02: 오른쪽 멤버 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full border ${borderClasses} flex items-center justify-center text-xs font-bold`}>02</span>
              <h2 className="text-sm font-bold uppercase tracking-widest">{language === 'kr' ? '오른쪽 멤버' : 'RIGHT MEMBER'}👉</h2>
            </div>
            <button 
              onClick={() => setIsNafes(!isNafes)}
              className={`flex items-center gap-2 px-4 py-2 border ${borderClasses} rounded-full text-[10px] font-bold transition-all ${isNafes ? buttonActiveClasses : buttonHoverClasses}`}
            >
              {isNafes ? 'NAFES ON' : 'NAFES OFF'}
            </button>
          </div>
          
          {isNafes ? (
            <div className="animate-in slide-in-from-top-2 space-y-4">
              <input 
                type="text" 
                value={nafesName}
                onChange={(e) => setNafesName(e.target.value)}
                placeholder="Name (e.g., Y/N)"
                className={`w-full p-4 border ${borderClasses} rounded-8 text-sm focus:outline-none bg-transparent`}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1">
                {kpopGroups.map(group => (
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

          {/* 추가 멤버 (Extra Members) 로직 유지 */}
          <div className="pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {extraMembers.map((em, idx) => (
                <div key={idx} className={`flex items-center gap-2 border ${borderClasses} px-3 py-1.5 text-xs font-bold rounded-full ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} animate-in zoom-in-90`}>
                  {em.member.name}
                  <button onClick={() => removeExtraMember(idx)} className="text-gray-300 hover:text-red-500"><X size={12} /></button>
                </div>
              ))}
              <button 
                onClick={() => setIsAddingExtra(!isAddingExtra)}
                className={`w-9 h-9 rounded-full border ${borderClasses} border-dashed flex items-center justify-center transition-all ${isAddingExtra ? buttonActiveClasses + ' rotate-45' : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}
              >
                <Plus size={18} />
              </button>
            </div>
            {isAddingExtra && (
              <div className={`mt-4 p-5 border ${borderClasses} border-dashed rounded-8 space-y-4 animate-in slide-in-from-top-4 ${theme === 'dark' ? 'bg-zinc-900/30' : 'bg-white'}`}>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1">
                  {kpopGroups.map(group => (
                    <button key={`eg-${group.id}`} onClick={() => setTempExtraGroup(group)} className={`p-2 text-[10px] font-bold border ${borderClasses} transition-all ${tempExtraGroup?.id === group.id ? buttonActiveClasses : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}>
                      {group.name}
                    </button>
                  ))}
                </div>
                {tempExtraGroup && (
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-1 animate-in slide-in-from-top-2">
                    {tempExtraGroup.members.map(member => (
                      <button key={`em-${member.id}`} onClick={() => addExtraMember(member)} className={`p-3 text-xs border ${borderClasses} transition-all font-medium ${theme === 'dark' ? 'bg-zinc-800' : 'bg-white'} ${buttonHoverClasses}`}>
                        {member.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 03 & 04 로직 동일 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full border ${borderClasses} flex items-center justify-center text-xs font-bold`}>03</span>
              <h2 className="text-sm font-bold uppercase tracking-widest">{language === 'kr' ? '주제 및 소재' : 'THEME & CONCEPT'}</h2>
            </div>
            <textarea
              placeholder="Write your story concept..."
              className={`w-full h-32 border ${borderClasses} rounded-8 p-4 text-sm focus:outline-none placeholder:text-gray-300 bg-transparent`}
              value={themeInput}
              onChange={(e) => setThemeInput(e.target.value)}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full border ${borderClasses} flex items-center justify-center text-xs font-bold`}>04</span>
              <h2 className="text-sm font-bold uppercase tracking-widest">{language === 'kr' ? '연재 분량' : 'LENGTH'}</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EPISODE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setEpisodeLimit(opt)}
                  className={`py-3 text-xs font-bold border ${borderClasses} rounded-8 transition-all ${episodeLimit === opt ? buttonActiveClasses : `${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} ${buttonHoverClasses}`}`}
                >
                  {opt} {language === 'kr' ? '회 분량' : 'EPISODES'}
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
          {language === 'kr' ? '연재 시작하기' : 'START WRITING'}
        </button>
      </section>
    </div>
  );

  // renderWriting, renderLibrary는 기존 코드와 동일하여 생략 (구조 유지)
  // ...
  
  return (
    <div className={`min-h-screen relative flex flex-col transition-colors duration-300 ${themeClasses}`}>
      <nav className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 border ${borderClasses} ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'} px-8 py-3 rounded-full flex items-center gap-12 z-[100] shadow-xl`}>
        <button onClick={() => setView(AppState.SETUP)} className={`flex flex-col items-center transition-all ${view === AppState.SETUP ? 'opacity-100 font-black' : 'opacity-30 hover:opacity-60'}`}>
          <span className="text-[10px] uppercase tracking-[0.2em]">Home</span>
        </button>
        <button onClick={() => setView(AppState.LIBRARY)} className={`flex flex-col items-center transition-all ${view === AppState.LIBRARY ? 'opacity-100 font-black' : 'opacity-30 hover:opacity-60'}`}>
          <span className="text-[10px] uppercase tracking-[0.2em]">Library</span>
        </button>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="flex flex-col items-center opacity-30 hover:opacity-100 transition-all">
          <span className="text-[10px] uppercase tracking-[0.2em]">{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </nav>

      <main className="flex-1">
        {view === AppState.SETUP && renderSetup()}
        {view === AppState.WRITING && renderWriting()} 
        {view === AppState.LIBRARY && renderLibrary()}
      </main>
      
      {/* Footer 및 기타 UI 요소 유지 */}
    </div>
  );
};

export default App;
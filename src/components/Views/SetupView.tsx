import React, { useState } from 'react';
import { IdolGroup, IdolMember, Story, AppState } from '../../../types';
import { Plus, X, Loader2, Globe } from 'lucide-react';
import { generateEpisode } from '../../../services/geminiService';

const EPISODE_OPTIONS = [10, 20, 50, 100];

interface Props {
  kpopGroups: IdolGroup[];
  language: 'kr' | 'en';
  setLanguage: (l: 'kr' | 'en') => void;
  theme: string;
  setLoading: (l: boolean) => void;
  loading: boolean;
  setCurrentStory: (s: Story) => void;
  setView: (v: AppState) => void;
  borderClasses: string;
  buttonActiveClasses: string;
  buttonHoverClasses: string;
}

const SetupView: React.FC<Props> = ({ kpopGroups, language, setLanguage, theme, setLoading, loading, setCurrentStory, setView, borderClasses, buttonActiveClasses, buttonHoverClasses }) => {
  const [leftGroup, setLeftGroup] = useState<IdolGroup | null>(null);
  const [leftMember, setLeftMember] = useState<IdolMember | null>(null);
  const [rightGroup, setRightGroup] = useState<IdolGroup | null>(null);
  const [rightMember, setRightMember] = useState<IdolMember | null>(null);
  const [isNafes, setIsNafes] = useState(false);
  const [nafesName, setNafesName] = useState('여주');
  const [extraMembers, setExtraMembers] = useState<{group: IdolGroup, member: IdolMember}[]>([]);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [tempExtraGroup, setTempExtraGroup] = useState<IdolGroup | null>(null);
  const [themeInput, setThemeInput] = useState('');
  const [episodeLimit, setEpisodeLimit] = useState(10);

  const handleStart = async () => {
    const rightCharName = isNafes ? nafesName : rightMember?.name;
    if (!leftMember || !rightCharName || !themeInput) return;
    setLoading(true);
    try {
      const initialStory: Story = {
        id: Date.now().toString(),
        title: `[${leftMember.name} X ${rightCharName}] 연재 중...`,
        groupName: Array.from(new Set([leftGroup?.name, !isNafes ? rightGroup?.name : null, ...extraMembers.map(em => em.group.name)])).filter(Boolean).join(', '),
        leftMember: leftMember.name,
        rightMember: rightCharName,
        isNafes, nafesName: isNafes ? nafesName : undefined,
        theme: themeInput, totalEpisodes: episodeLimit, episodes: [], isCompleted: false, createdAt: Date.now(),
        leftMemberContext: leftMember.personality, rightMemberContext: !isNafes ? rightMember?.personality : undefined, language
      };
      const firstEp = await generateEpisode(initialStory, themeInput, 1);
      const newStory = { ...initialStory, title: firstEp.storyTitle || initialStory.title, episodes: [{ episodeNumber: 1, content: firstEp.content, suggestions: firstEp.suggestions }]};
      setCurrentStory(newStory);
      setView(AppState.WRITING);
    } catch (e) { alert("집필 중 오류가 발생했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in duration-700 pb-24 relative">
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
        <button onClick={() => setLanguage(language === 'kr' ? 'en' : 'kr')} className={`p-3 border ${borderClasses} rounded-full transition-all ${buttonHoverClasses} flex items-center gap-2 shadow-sm`}>
          <Globe size={18} /><span className="text-[10px] font-bold uppercase">{language.toUpperCase()}</span>
        </button>
      </div>
      <header className="text-center pt-8">
        <img src="/pikficlogo.png" alt="Logo" className="mx-auto w-full max-w-[250px] mb-4" />
        <div className="space-y-1 opacity-70 text-[10px] font-bold uppercase tracking-[0.2em]">
          <p>마이너도 크오도 성실하게 글 써드립니다🤓☝️</p>
          <p>🔧TEST중🔧 불편한 점 스핀이나 디엠주세요.</p>
          <p>무료토큰 다 쓰면 집필 실패 떠요ㄷㄷ 나중에ㄱㄱ</p>
        </div>
      </header>
      <section className={`space-y-10 border-t ${borderClasses} pt-10`}>
        {/* 01: 왼쪽 멤버 */}
        <div className="space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest"><span className={`w-8 h-8 inline-flex rounded-full border ${borderClasses} items-center justify-center mr-2 text-xs font-bold`}>01</span>{language === 'kr' ? '왼쪽 멤버' : 'LEFT MEMBER'}👈</h2>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1">
            {kpopGroups.map(g => (
              <button key={g.id} onClick={() => {setLeftGroup(g); setLeftMember(null);}} className={`p-2 text-[10px] font-bold border ${borderClasses} ${leftGroup?.id === g.id ? buttonActiveClasses : buttonHoverClasses}`}>{g.name}</button>
            ))}
          </div>
          {leftGroup && (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-1 animate-in slide-in-from-top-2">
              {leftGroup.members.map(m => (
                <button key={m.id} onClick={() => setLeftMember(m)} className={`p-3 text-xs border ${borderClasses} ${leftMember?.id === m.id ? buttonActiveClasses : buttonHoverClasses}`}>{m.name}</button>
              ))}
            </div>
          )}
        </div>

        {/* 02: 오른쪽 멤버 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest"><span className={`w-8 h-8 inline-flex rounded-full border ${borderClasses} items-center justify-center mr-2 text-xs font-bold`}>02</span>{language === 'kr' ? '오른쪽 멤버' : 'RIGHT MEMBER'}👉</h2>
            <button onClick={() => setIsNafes(!isNafes)} className={`flex items-center gap-2 px-4 py-2 border ${borderClasses} rounded-full text-[10px] font-bold transition-all ${isNafes ? buttonActiveClasses : buttonHoverClasses}`}>🙋‍♀️ {language === 'kr' ? '저요저요' : 'NAFES'} {isNafes ? 'ON' : 'OFF'}</button>
          </div>
          {isNafes ? (
            <input type="text" value={nafesName} onChange={e => setNafesName(e.target.value)} className={`w-full p-4 border ${borderClasses} rounded-8 text-sm bg-transparent`} placeholder="이름을 입력하세요" />
          ) : (
            <>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1">
                {kpopGroups.map(g => (
                  <button key={g.id} onClick={() => {setRightGroup(g); setRightMember(null);}} className={`p-2 text-[10px] font-bold border ${borderClasses} ${rightGroup?.id === g.id ? buttonActiveClasses : buttonHoverClasses}`}>{g.name}</button>
                ))}
              </div>
              {rightGroup && (
                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-1 animate-in slide-in-from-top-2">
                  {rightGroup.members.map(m => (
                    <button key={m.id} onClick={() => setRightMember(m)} className={`p-3 text-xs border ${borderClasses} ${rightMember?.id === m.id ? buttonActiveClasses : buttonHoverClasses}`}>{m.name}</button>
                  ))}
                </div>
              )}
            </>
          )}
          {/* 등장인물 추가 */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {extraMembers.map((em, i) => (
              <div key={i} className={`flex items-center gap-2 border ${borderClasses} px-3 py-1.5 text-xs font-bold rounded-full`}>
                {em.member.name} <X size={12} className="cursor-pointer" onClick={() => setExtraMembers(extraMembers.filter((_, idx) => idx !== i))} />
              </div>
            ))}
            <button onClick={() => setIsAddingExtra(!isAddingExtra)} className={`w-9 h-9 rounded-full border ${borderClasses} border-dashed flex items-center justify-center transition-all ${isAddingExtra ? 'rotate-45' : ''}`}><Plus size={18} /></button>
          </div>
        </div>

        {/* 03 & 04 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest"><span className={`w-8 h-8 inline-flex rounded-full border ${borderClasses} items-center justify-center mr-2 text-xs font-bold`}>03</span>{language === 'kr' ? '주제 및 소재' : 'THEME & CONCEPT'}</h2>
            <textarea placeholder="분위기, 소재를 입력하세요..." className={`w-full h-32 border ${borderClasses} rounded-8 p-4 text-sm bg-transparent`} value={themeInput} onChange={e => setThemeInput(e.target.value)} />
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest"><span className={`w-8 h-8 inline-flex rounded-full border ${borderClasses} items-center justify-center mr-2 text-xs font-bold`}>04</span>{language === 'kr' ? '연재 분량' : 'LENGTH'}</h2>
            <div className="grid grid-cols-2 gap-2">
              {EPISODE_OPTIONS.map(opt => (
                <button key={opt} disabled={opt > 20} onClick={() => setEpisodeLimit(opt)} className={`py-3 text-xs font-bold border ${borderClasses} rounded-8 ${opt > 20 ? 'opacity-40 cursor-not-allowed' : episodeLimit === opt ? buttonActiveClasses : buttonHoverClasses}`}>
                  {opt} {language === 'kr' ? '회 분량' : 'EPISODES'} {opt > 20 && "🔒"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={handleStart} disabled={!leftMember || (!isNafes && !rightMember) || !themeInput || loading} className={`w-full py-5 border ${borderClasses} ${buttonActiveClasses} font-black text-xl rounded-8 flex items-center justify-center gap-3 transition-all disabled:opacity-30`}>
          {loading && <Loader2 className="animate-spin" />} {language === 'kr' ? '연재 시작하기' : 'START WRITING'}
        </button>
      </section>
    </div>
  );
};
export default SetupView;
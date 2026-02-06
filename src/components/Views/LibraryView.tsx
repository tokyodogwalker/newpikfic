import React from 'react';
import { Story, AppState } from '../../../types';
import { Trash2 } from 'lucide-react';

interface Props {
  stories: Story[];
  setCurrentStory: (s: Story) => void;
  setView: (v: AppState) => void;
  deleteFromLibrary: (id: string) => void;
  theme: string;
  borderClasses: string;
  buttonActiveClasses: string;
  buttonHoverClasses: string;
}

const LibraryView: React.FC<Props> = ({ stories, setCurrentStory, setView, deleteFromLibrary, theme, borderClasses, buttonActiveClasses, buttonHoverClasses }) => {
  return (
    <div className={`max-w-4xl mx-auto p-6 space-y-12 animate-in fade-in pb-24`}>
      <div className={`flex items-center justify-between border-b ${borderClasses} pb-8`}>
        <h1 className="text-4xl font-black tracking-tighter uppercase">Library</h1>
        <button onClick={() => setView(AppState.SETUP)} className={`flex items-center gap-1 border ${borderClasses} px-4 py-2 rounded-8 text-[10px] font-black uppercase transition-all ${buttonHoverClasses}`}>새 글 쓰기</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stories.length === 0 ? (
          <div className="col-span-full text-center py-32 border border-dashed border-gray-300 dark:border-zinc-700 rounded-8"><p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No archives found</p></div>
        ) : (
          stories.map(story => (
            <div key={story.id} className={`border ${borderClasses} rounded-8 p-6 transition-all flex flex-col justify-between ${theme === 'dark' ? 'bg-zinc-900/50' : 'bg-white'}`}>
              <div><h3 className="text-lg font-black uppercase tracking-tight truncate w-full mb-1">{story.title}</h3><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">{story.leftMember} x {story.rightMember}</p></div>
              <div className="flex gap-2"><button onClick={() => { setCurrentStory(story); setView(AppState.WRITING); }} className={`flex-1 ${buttonActiveClasses} py-3 rounded-[6px] text-[10px] font-black uppercase transition-all hover:opacity-80`}>Read Archive</button><button onClick={() => deleteFromLibrary(story.id)} className={`p-3 border ${borderClasses} rounded-[6px] text-gray-400 hover:text-red-500 transition-all`}><Trash2 size={16} /></button></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default LibraryView;
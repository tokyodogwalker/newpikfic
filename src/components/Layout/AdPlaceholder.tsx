import React from 'react';
import { X } from 'lucide-react';

interface Props { theme: string; borderClasses: string; }

export const AdPlaceholder: React.FC<Props> = ({ theme, borderClasses }) => (
  <div className={`w-full h-40 border ${borderClasses} rounded-8 flex items-center justify-center ${theme === 'dark' ? 'bg-zinc-900' : 'bg-gray-50'} mb-8 overflow-hidden relative group`}>
    <div className="text-center p-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Sponsored</p>
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">PIKFIC Premium을 경험해보세요</p>
      <p className="text-xs text-gray-400 mt-2 italic">광고 노출 중... 잠시만 기다려주세요</p>
    </div>
    <div className="absolute top-2 right-2 cursor-pointer text-gray-300"><X size={14} /></div>
  </div>
);
import { useState, useEffect } from 'react';
import { Story } from '../../types';

export const useStoryManager = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pikfic_stories');
    if (saved) setStories(JSON.parse(saved));
  }, []);

  const saveStories = (updated: Story[]) => {
    setStories(updated);
    localStorage.setItem('pikfic_stories', JSON.stringify(updated));
  };

  const saveToLibrary = (story: Story) => {
    const currentStories = JSON.parse(localStorage.getItem('pikfic_stories') || '[]');
    const existingIdx = currentStories.findIndex((s: Story) => s.id === story.id);
    const updated = existingIdx >= 0 
      ? currentStories.map((s: Story, i: number) => i === existingIdx ? story : s)
      : [story, ...currentStories];
    saveStories(updated);
    alert("서재에 안전하게 저장되었습니다.");
  };

  const deleteFromLibrary = (id: string) => {
    if (confirm("이 기록을 삭제하시겠습니까?")) {
      saveStories(stories.filter(s => s.id !== id));
    }
  };

  return { stories, currentStory, setCurrentStory, loading, setLoading, saveToLibrary, deleteFromLibrary };
};
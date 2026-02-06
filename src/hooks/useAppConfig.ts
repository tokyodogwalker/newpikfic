import { useState, useEffect } from 'react';
import { Theme } from '@/types';

export const useAppConfig = () => {
  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguage] = useState<'kr' | 'en'>('kr');

  useEffect(() => {
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

  return { theme, setTheme, language, setLanguage };
};
export interface IdolMember {
  id: string;
  name: string;
  image: string;
  personality?: string; 
}

export interface IdolGroup {
  id: string;
  name: string;
  members: IdolMember[];
}

export interface Episode {
  episodeNumber: number;
  content: string;
  suggestions: string[];
  userChoice?: string;
}

export interface Story {
  id: string;
  title: string;
  groupName: string;
  leftMember: string;
  rightMember: string;
  isNafes?: boolean;
  nafesName?: string;
  theme: string;
  totalEpisodes: number;
  episodes: Episode[];
  isCompleted: boolean;
  createdAt: number;
}

export enum AppState {
  SETUP = 'SETUP',
  WRITING = 'WRITING',
  LIBRARY = 'LIBRARY'
}

export type Theme = 'light' | 'dark';

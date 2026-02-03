/**
 * Supabase DB: app_config 테이블 대응
 */
export interface AppConfig {
  config_key: string;   // primary key (예: 'writing_guidelines')
  config_value: string;
  category: string;
  updated_at: string;
}

/**
 * Supabase DB: idol_members 테이블 대응
 * 글로벌 서비스를 위해 다국어 이름 및 고증 데이터(background, traits) 포함
 */
export interface IdolMember {
  id: string; // uuid
  name_kr: string;
  name_en: string;
  name_cn: string;
  name_jp: string;
  name_alias?: string;
  personal_background?: string;
  personal_traits?: string;
  image?: string; // 기존 UI 호환용
}

/**
 * Supabase DB: idol_groups 테이블 대응
 */
export interface IdolGroup {
  id: string; // uuid
  group_name: string;
  group_name_en: string;
  group_context?: string;
  created_at?: string;
  members: IdolMember[]; // member_group_map을 통해 조인된 결과
}

/**
 * Supabase DB: member_knowledge 테이블 대응 (RAG용)
 */
export interface MemberKnowledge {
  id: string;
  member_id: string;
  content: string;
  embedding?: number[]; // vector(1536 등)
}

export interface Episode {
  episodeNumber: number;
  content: string;
  suggestions: string[];
  userChoice?: string;
}

/**
 * Story 인터페이스 확장
 * AI에게 전달할 인물별 고증 컨텍스트 필드 추가
 */
export interface Story {
  id: string;
  title: string;
  groupName: string;
  leftMember: string;
  rightMember: string;
  
  // RAG 및 고증 강화를 위한 컨텍스트 주입 필드
  leftMemberContext?: string;  // 왼쪽 멤버의 traits + background
  rightMemberContext?: string; // 오른쪽 멤버의 traits + background
  ragKnowledge?: string;       // member_knowledge에서 검색된 추가 정보
  
  isNafes?: boolean;
  nafesName?: string;
  theme: string;
  totalEpisodes: number;
  episodes: Episode[];
  isCompleted: boolean;
  createdAt: number;
  language?: 'kr' | 'en' | 'jp' | 'cn'; // 글로벌 서비스 타겟 언어
}

export enum AppState {
  SETUP = 'SETUP',
  WRITING = 'WRITING',
  LIBRARY = 'LIBRARY'
}

export type Theme = 'light' | 'dark';
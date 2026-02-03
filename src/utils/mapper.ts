// src/utils/mapper.ts
import { IdolGroup, IdolMember } from '@/types';

/**
 * Supabase에서 가져온 로우 데이터를 앱에서 사용하는 IdolGroup 형식으로 변환합니다.
 */
export const mapDbToIdolGroup = (dbData: any[], language: 'kr' | 'en'): IdolGroup[] => {
  return dbData.map((g: any) => ({
    id: g.id,
    group_name: g.group_name,
    group_name_en: g.group_name_en,
    group_context: g.group_context,
    name: language === 'kr' ? g.group_name : g.group_name_en,
    members: g.idol_members.map((m: any) => ({
      id: m.id,
      name: language === 'kr' ? m.name_kr : m.name_en,
      name_kr: m.name_kr,
      name_en: m.name_en,
      image: '', 
      personality: `[Traits] ${m.personal_traits} [Background] ${m.personal_background}`
    }))
  }));
};
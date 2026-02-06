import { useState, useEffect } from 'react';
import { IdolGroup } from '@/types';
import { supabase } from '@/src/lib/supabase';
import { mapDbToIdolGroup } from '@/src/utils/mapper';

export const useIdolData = (language: 'kr' | 'en') => {
  const [kpopGroups, setKpopGroups] = useState<IdolGroup[]>([]);

  useEffect(() => {
    const fetchIdolData = async () => {
      const { data, error } = await supabase
        .from('idol_groups')
        .select(`
          id, group_name, group_name_en, group_context,
          idol_members (id, name_kr, name_en, personal_background, personal_traits)
        `);
      if (!error && data) {
        setKpopGroups(mapDbToIdolGroup(data, language));
      }
    };
    fetchIdolData();
  }, [language]);

  return { kpopGroups };
};
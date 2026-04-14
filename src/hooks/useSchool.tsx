import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface School {
  id: string;
  name: string;
  logo_url: string | null;
  role: 'admin' | 'teacher' | 'headteacher';
}

interface SchoolContextType {
  schools: School[];
  activeSchool: School | null;
  setActiveSchool: (school: School) => void;
  loading: boolean;
  refreshSchools: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSchool, setActiveSchoolState] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSchools = useCallback(async () => {
    if (!profile) {
      setSchools([]);
      setActiveSchoolState(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profile_schools')
        .select('school_id, role, schools:school_id(id, name, logo_url)')
        .eq('profile_id', profile.id);

      if (error) throw error;

      const mapped: School[] = (data || [])
        .filter((d: any) => d.schools)
        .map((d: any) => ({
          id: d.schools.id,
          name: d.schools.name,
          logo_url: d.schools.logo_url,
          role: d.role,
        }));

      setSchools(mapped);

      // Restore last active school from localStorage or pick first
      const savedSchoolId = localStorage.getItem('activeSchoolId');
      const saved = mapped.find(s => s.id === savedSchoolId);
      if (saved) {
        setActiveSchoolState(saved);
      } else if (mapped.length > 0) {
        setActiveSchoolState(mapped[0]);
        localStorage.setItem('activeSchoolId', mapped[0].id);
      } else {
        setActiveSchoolState(null);
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const setActiveSchool = (school: School) => {
    setActiveSchoolState(school);
    localStorage.setItem('activeSchoolId', school.id);
  };

  return (
    <SchoolContext.Provider value={{
      schools,
      activeSchool,
      setActiveSchool,
      loading,
      refreshSchools: fetchSchools,
    }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider');
  }
  return context;
}

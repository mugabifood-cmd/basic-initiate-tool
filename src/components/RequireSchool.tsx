import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSchool } from '@/hooks/useSchool';
import { supabase } from '@/integrations/supabase/client';

/**
 * Onboarding gate:
 * - Admin with no school              -> /setup
 * - Admin with a school but no teachers -> /admin/reports (Report Card System hub)
 * - Otherwise                          -> render children
 *
 * Non-admins are unaffected.
 */
export function RequireSchool({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const { schools, activeSchool, loading: schoolLoading } = useSchool();
  const location = useLocation();
  const [teacherCheck, setTeacherCheck] = useState<{ schoolId: string; hasTeachers: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (profile?.role !== 'admin' || !activeSchool) return;
      setChecking(true);
      const { count } = await supabase
        .from('profile_schools')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', activeSchool.id)
        .neq('role', 'admin');
      if (!cancelled) {
        setTeacherCheck({ schoolId: activeSchool.id, hasTeachers: (count ?? 0) > 0 });
        setChecking(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [profile?.role, activeSchool?.id]);

  if (authLoading || schoolLoading || (profile?.role === 'admin' && activeSchool && checking && !teacherCheck)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const path = location.pathname;

  // Step 1: Admin without a school -> /setup
  if (isAdmin && schools.length === 0 && path !== '/setup' && path !== '/register-school') {
    return <Navigate to="/setup" replace />;
  }

  // Step 2: Admin with a school but no teachers -> /admin/reports (Report Card System)
  // Allow teacher management, school management and the reports hub itself.
  const allowedNoTeacherPaths = [
    '/admin/reports',
    '/admin/teachers',
    '/admin/schools',
    '/register-school',
  ];
  if (
    isAdmin &&
    schools.length > 0 &&
    teacherCheck &&
    teacherCheck.schoolId === activeSchool?.id &&
    !teacherCheck.hasTeachers &&
    !allowedNoTeacherPaths.includes(path)
  ) {
    return <Navigate to="/admin/reports" replace />;
  }

  return <>{children}</>;
}

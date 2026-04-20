import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSchool } from '@/hooks/useSchool';

/**
 * Gate that ensures admins have at least one school before accessing the app.
 * Admins without a school are redirected to /setup.
 * Non-admins are unaffected (they're created by an admin and inherit a school).
 */
export function RequireSchool({ children }: { children: React.ReactNode }) {
  const { profile, loading: authLoading } = useAuth();
  const { schools, loading: schoolLoading } = useSchool();
  const location = useLocation();

  if (authLoading || schoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Admins must have at least one school
  if (profile?.role === 'admin' && schools.length === 0 && location.pathname !== '/setup' && location.pathname !== '/register-school') {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

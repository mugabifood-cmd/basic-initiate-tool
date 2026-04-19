import { Link, Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSchool } from '@/hooks/useSchool';

export default function Setup() {
  const { profile, signOut } = useAuth();
  const { schools, loading } = useSchool();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Only admins should see this page
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // If admin already has a school, send them onward
  if (schools.length > 0) {
    return <Navigate to="/admin/reports" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background p-4">
      <div className="max-w-2xl mx-auto pt-12">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {profile?.full_name}</h1>
            <p className="text-muted-foreground">
              Let's get your school set up to unlock the full system.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Card className="border-primary/50 ring-2 ring-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Building2 className="h-10 w-10 text-primary" />
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                Required
              </span>
            </div>
            <CardTitle>Register Your School</CardTitle>
            <CardDescription>
              Create your school account with name, contact details, and branding.
              You'll be able to add teachers and manage report cards once your school is registered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/register-school">Register School</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


import { Link, Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, UserPlus, LogOut, CheckCircle2 } from 'lucide-react';
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

  const hasSchool = schools.length > 0;

  // If admin already has a school, send them to dashboard
  if (hasSchool) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background p-4">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome, {profile?.full_name}</h1>
            <p className="text-muted-foreground">
              Let's get your school set up. Complete each step to unlock the full system.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Step 1: Register School */}
          <Card className="border-primary/50 ring-2 ring-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Building2 className="h-10 w-10 text-primary" />
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Step 1
                </span>
              </div>
              <CardTitle>Register Your School</CardTitle>
              <CardDescription>
                Create your school account with name, contact details, and branding.
                This is required before you can do anything else.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/register-school">Register School</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Register Teacher (disabled) */}
          <Card className="opacity-60">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <UserPlus className="h-10 w-10 text-muted-foreground" />
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  Step 2
                </span>
              </div>
              <CardTitle>Register Teachers</CardTitle>
              <CardDescription>
                Add teachers to your school and assign them to subjects and classes.
                Available after your school is registered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Locked — register a school first
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

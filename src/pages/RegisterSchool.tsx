import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchool } from '@/hooks/useSchool';
import { toast } from '@/hooks/use-toast';
import { Building2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RegisterSchool() {
  const { user, profile } = useAuth();
  const { refreshSchools, schools } = useSchool();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Each account can only register one school
  if (schools.length >= 1) {
    return <Navigate to="/dashboard" replace />;
  }

  const [schoolName, setSchoolName] = useState('');
  const [location, setLocation] = useState('');
  const [poBox, setPoBox] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [motto, setMotto] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      // 1. Create the school
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: schoolName.trim(),
          location: location.trim() || null,
          po_box: poBox.trim() || null,
          email: email.trim() || null,
          telephone: telephone.trim() || null,
          motto: motto.trim() || null,
        })
        .select('id')
        .single();

      if (schoolError) throw schoolError;

      // 2. Link the current user as admin of this school
      const { error: linkError } = await supabase
        .from('profile_schools')
        .insert({
          profile_id: profile.id,
          school_id: school.id,
          role: 'admin',
        });

      if (linkError) throw linkError;

      toast({
        title: 'School Registered',
        description: `${schoolName} has been created successfully. You are the admin.`,
      });

      await refreshSchools();
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-background dark:to-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Building2 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Register Your School</CardTitle>
          <CardDescription>
            Create a new school account to start managing report cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name *</Label>
              <Input
                id="school-name"
                placeholder="e.g. St. Mary's Secondary School"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school-location">Location</Label>
                <Input
                  id="school-location"
                  placeholder="e.g. Kampala"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-pobox">P.O. Box</Label>
                <Input
                  id="school-pobox"
                  placeholder="e.g. P.O. Box 1234"
                  value={poBox}
                  onChange={(e) => setPoBox(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school-email">Email</Label>
                <Input
                  id="school-email"
                  type="email"
                  placeholder="school@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-telephone">Telephone</Label>
                <Input
                  id="school-telephone"
                  placeholder="+256 ..."
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-motto">School Motto</Label>
              <Input
                id="school-motto"
                placeholder="e.g. Excellence in Education"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating School...' : 'Register School'}
            </Button>

            <div className="text-center">
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back to Dashboard
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

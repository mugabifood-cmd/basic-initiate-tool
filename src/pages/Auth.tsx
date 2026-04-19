import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface ClassSlot {
  className: string;
  stream: string;
}

interface SubjectAssignment {
  subjectId: string;
  classSlots: ClassSlot[];
}

interface ClassAssignment {
  className: string;
  stream: string;
}

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [streams, setStreams] = useState<string[]>([]);

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up Form State (admin-only public signup)
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const selectedRole: 'admin' = 'admin';

  // Teacher Assignment State
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [classAssignment, setClassAssignment] = useState<ClassAssignment>({ className: '', stream: '' });

  // Fetch subjects, classes, and streams for teacher assignments
  useEffect(() => {
    const fetchData = async () => {
      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, code')
        .order('name');
      
      if (subjectsData) {
        setSubjects(subjectsData);
      }

      // Fetch unique class names
      const { data: classesData } = await supabase
        .from('classes')
        .select('name')
        .order('name');
      
      if (classesData) {
        const uniqueClasses = [...new Set(classesData.map(c => c.name).filter(Boolean))];
        setClasses(uniqueClasses);
      }

      // Fetch unique streams
      const { data: streamsData } = await supabase
        .from('classes')
        .select('stream')
        .order('stream');
      
      if (streamsData) {
        const uniqueStreams = [...new Set(streamsData.map(s => s.stream).filter((v) => v && v.trim() !== ''))];
        setStreams(uniqueStreams);
      }
    };
    
    fetchData();
  }, []);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await signIn(signInEmail, signInPassword);
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signUpPassword !== confirmPassword) {
      return;
    }
    
    setIsLoading(true);

    // Public signup is admin-only. Teachers/headteachers are created by an admin
    // from within their school dashboard.
    await signUp(signUpEmail, signUpPassword, signUpName, 'admin');

    setIsLoading(false);
  };

  const addSubjectAssignment = () => {
    const newAssignment: SubjectAssignment = {
      subjectId: '',
      classSlots: [
        { className: '', stream: '' },
        { className: '', stream: '' },
        { className: '', stream: '' },
        { className: '', stream: '' }
      ]
    };
    setSubjectAssignments([...subjectAssignments, newAssignment]);
  };

  const removeSubjectAssignment = (index: number) => {
    setSubjectAssignments(subjectAssignments.filter((_, i) => i !== index));
  };

  const updateSubjectAssignment = (index: number, subjectId: string) => {
    const updated = [...subjectAssignments];
    updated[index].subjectId = subjectId;
    setSubjectAssignments(updated);
  };

  const updateClassSlot = (assignmentIndex: number, slotIndex: number, field: 'className' | 'stream', value: string) => {
    const updated = [...subjectAssignments];
    updated[assignmentIndex].classSlots[slotIndex][field] = value === 'none' ? '' : value;
    setSubjectAssignments(updated);
  };

  const getSelectedClassesForAssignment = (assignmentIndex: number): string[] => {
    return subjectAssignments[assignmentIndex]?.classSlots
      .map(slot => slot.className)
      .filter(className => className !== '') || [];
  };

  const isClassDisabledForSlot = (assignmentIndex: number, slotIndex: number, className: string): boolean => {
    const selectedClasses = getSelectedClassesForAssignment(assignmentIndex);
    const currentSlotClass = subjectAssignments[assignmentIndex]?.classSlots[slotIndex]?.className;
    
    // Allow the current slot's class, but disable if it's selected in other slots
    return selectedClasses.includes(className) && currentSlotClass !== className;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-900">
            O-Level Report Card System
          </CardTitle>
          <CardDescription>
            Sign in to manage your school's report cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="Enter your password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                  <p className="font-medium text-foreground">Admin account</p>
                  <p className="text-muted-foreground mt-1">
                    Public sign-up creates a school admin. After registering, you'll set up your
                    school and then add teachers from inside the dashboard.
                  </p>
                </div>


                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
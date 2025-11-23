import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface TeacherAssignments {
  subjectAssignments: Array<{
    subjectId: string;
    classes: Array<{ className: string; stream: string }>;
  }>;
  classAssignment: Array<{ className: string; stream: string }>;
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

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'teacher' | 'headteacher'>('teacher');

  // Teacher Assignment State - Simplified for Subject Teacher
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectTeacherClass, setSubjectTeacherClass] = useState('');
  const [subjectTeacherStream, setSubjectTeacherStream] = useState('');
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
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    let assignments: TeacherAssignments | undefined = undefined;
    
    if (selectedRole === 'teacher') {
      try {
        // Validate minimum 5 subjects for Subject Teacher
        if (selectedSubjects.length > 0 && selectedSubjects.length < 5) {
          toast({
            title: "Insufficient Subjects",
            description: "Subject Teachers must be assigned at least 5 subjects. Please select more subjects.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // Process subject teacher assignments (same class/stream, multiple subjects)
        const processedSubjectAssignments = selectedSubjects
          .filter(subjectId => subjectId && subjectId.trim() !== '')
          .map(subjectId => {
            let classes: Array<{ className: string; stream: string }> = [];
            
            if (subjectTeacherClass && subjectTeacherStream) {
              if (subjectTeacherStream === 'all') {
                // Expand to all streams
                classes = streams.map(stream => ({
                  className: subjectTeacherClass,
                  stream: stream
                }));
              } else {
                classes = [{ className: subjectTeacherClass, stream: subjectTeacherStream }];
              }
            }
            
            return {
              subjectId: subjectId,
              classes: classes
            };
          })
          .filter(sa => sa.classes.length > 0);
        
        // Process class teacher assignment
        let processedClassAssignment: Array<{ className: string; stream: string }> = [];
        if (classAssignment.className && classAssignment.stream) {
          if (classAssignment.stream === 'all') {
            // Expand "All" to all available streams for class teacher
            processedClassAssignment = streams.map(stream => ({
              className: classAssignment.className,
              stream: stream
            }));
          } else {
            processedClassAssignment = [classAssignment];
          }
        }
        
        // Only include assignments if there's at least one subject assignment or class assignment
        if (processedSubjectAssignments.length > 0 || processedClassAssignment.length > 0) {
          assignments = {
            subjectAssignments: processedSubjectAssignments,
            classAssignment: processedClassAssignment
          };
        }
      } catch (error) {
        console.error('Error processing assignments:', error);
        toast({
          title: "Assignment Processing Error",
          description: "There was an error processing your assignments. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
    }
    
    const result = await signUp(signUpEmail, signUpPassword, signUpName, selectedRole, assignments);
    
    if (result.error) {
      console.error('Signup error:', result.error);
    }
    
    setIsLoading(false);
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
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
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={selectedRole} onValueChange={(value: 'admin' | 'teacher' | 'headteacher') => setSelectedRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="headteacher">Head Teacher</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedRole === 'teacher' && (
                  <>
                    <Separator className="my-6" />
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Teacher Assignments</h3>
                        
                        {/* Subject Teacher Assignments - Simplified */}
                        <div className="space-y-4">
                          <div>
                            <Label className="text-base font-medium">Subject Teacher</Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Select class, stream, and subjects (minimum 5 subjects required)
                            </p>
                          </div>
                          
                          {/* Class Selection */}
                          <div className="space-y-2">
                            <Label>Class</Label>
                            <Select value={subjectTeacherClass} onValueChange={setSubjectTeacherClass}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                              <SelectContent>
                                {classes.map((className) => (
                                  <SelectItem key={className} value={className}>
                                    {className}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Stream Selection */}
                          <div className="space-y-2">
                            <Label>Stream</Label>
                            <Select 
                              value={subjectTeacherStream} 
                              onValueChange={setSubjectTeacherStream}
                              disabled={!subjectTeacherClass}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select stream" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Streams</SelectItem>
                                {streams.map((stream) => (
                                  <SelectItem key={stream} value={stream}>
                                    {stream}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Subject Multi-Selection */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Subjects (Select at least 5)</Label>
                              <span className={`text-xs font-medium ${selectedSubjects.length >= 5 ? 'text-green-600' : 'text-destructive'}`}>
                                {selectedSubjects.length} selected
                              </span>
                            </div>
                            <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                              {subjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No subjects available
                                </p>
                              ) : (
                                subjects.map((subject) => (
                                  <label
                                    key={subject.id}
                                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedSubjects.includes(subject.id)}
                                      onChange={() => toggleSubject(subject.id)}
                                      className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-sm">
                                      {subject.name}{subject.code ? ` (${subject.code})` : ''}
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                            {selectedSubjects.length > 0 && selectedSubjects.length < 5 && (
                              <p className="text-xs text-destructive mt-1">
                                Please select at least {5 - selectedSubjects.length} more subject(s)
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <Separator className="my-4" />
                        
                        {/* Class Teacher Assignment */}
                        <div className="space-y-3">
                          <Label className="text-base font-medium">Class Teacher (Optional)</Label>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                               <Label htmlFor="class-teacher-class" className="text-sm">Class</Label>
                                <Select
                                  value={classAssignment.className || 'none'}
                                  onValueChange={(value) => setClassAssignment({ ...classAssignment, className: value === 'none' ? '' : value, stream: '' })}
                                >
                                 <SelectTrigger>
                                   <SelectValue placeholder="Select class" />
                                 </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {classes
                                      .filter(Boolean)
                                      .map((className) => (
                                       <SelectItem key={className} value={className}>
                                         {className}
                                       </SelectItem>
                                     ))}
                                 </SelectContent>
                               </Select>
                             </div>
                             <div>
                               <Label htmlFor="class-teacher-stream" className="text-sm">Stream</Label>
                                <Select
                                  value={classAssignment.stream || 'none'}
                                  onValueChange={(value) => setClassAssignment({ ...classAssignment, stream: value === 'none' ? '' : value })}
                                  disabled={!classAssignment.className}
                                >
                                 <SelectTrigger>
                                   <SelectValue placeholder="Select stream" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="none">None</SelectItem>
                                   <SelectItem value="all">All</SelectItem>
                                   {streams
                                     .filter((s) => s && s.trim() !== '')
                                     .map((stream) => (
                                      <SelectItem key={stream} value={stream}>
                                        {stream}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                               </Select>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
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
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

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'teacher' | 'headteacher'>('teacher');

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
    
    const assignments = selectedRole === 'teacher' ? {
      subjectAssignments: subjectAssignments
        .filter(sa => sa.subjectId) // Only include assignments with a subject
        .map(sa => {
          // Expand "All" streams to all available streams
          const expandedSlots = sa.classSlots
            .filter(slot => slot.className) // Only include slots with a class
            .flatMap(slot => {
              if (slot.stream === 'all') {
                // Expand to all streams for this class
                return streams.map(stream => ({
                  className: slot.className,
                  stream: stream
                }));
              } else if (slot.stream) {
                // Regular stream selection
                return [{ className: slot.className, stream: slot.stream }];
              }
              return [];
            });
          
          return {
            subjectId: sa.subjectId,
            classes: expandedSlots
          };
        })
        .filter(sa => sa.classes.length > 0), // Only include assignments with at least one class
      classAssignment: (() => {
        if (classAssignment.className && classAssignment.stream) {
          if (classAssignment.stream === 'all') {
            // Return null for "All" in class teacher - will be handled differently
            // Class teacher can only be for one stream at a time
            return null;
          }
          return classAssignment;
        }
        return null;
      })()
    } : undefined;
    
    await signUp(signUpEmail, signUpPassword, signUpName, selectedRole, assignments);
    
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
                        
                        {/* Subject Teacher Assignments */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-base font-medium">Subject Teacher</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addSubjectAssignment}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Subject
                            </Button>
                          </div>
                          
                          {subjectAssignments.map((assignment, index) => (
                            <div key={index} className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <Select
                                  value={assignment.subjectId}
                                  onValueChange={(value) => updateSubjectAssignment(index, value)}
                                >
                                  <SelectTrigger className="w-full max-w-xs">
                                    <SelectValue placeholder="Select subject" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {subjects
                                      .filter((subject) => subject && subject.id && subject.name)
                                      .map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
                                          {subject.name}{subject.code ? ` (${subject.code})` : ''}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeSubjectAssignment(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                               <div>
                                 <Label className="text-sm font-medium mb-3 block">Classes & Streams</Label>
                                 <div className="space-y-3">
                                   {assignment.classSlots.map((slot, slotIndex) => (
                                     <div key={slotIndex} className="grid grid-cols-2 gap-3">
                                       <div>
                                         <Label className="text-xs text-muted-foreground">Class {slotIndex + 1}</Label>
                                          <Select
                                            value={slot.className || 'none'}
                                            onValueChange={(value) => updateClassSlot(index, slotIndex, 'className', value)}
                                          >
                                           <SelectTrigger className="h-8">
                                             <SelectValue placeholder="Select class" />
                                           </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="none">None</SelectItem>
                                              {classes
                                                .filter(Boolean)
                                                .map((className) => (
                                                  <SelectItem 
                                                    key={className} 
                                                    value={className}
                                                    disabled={isClassDisabledForSlot(index, slotIndex, className)}
                                                  >
                                                    {className}
                                                  </SelectItem>
                                                ))}
                                           </SelectContent>
                                         </Select>
                                       </div>
                                       <div>
                                         <Label className="text-xs text-muted-foreground">Stream</Label>
                                          <Select
                                            value={slot.stream || 'none'}
                                            onValueChange={(value) => updateClassSlot(index, slotIndex, 'stream', value)}
                                            disabled={!slot.className}
                                          >
                                           <SelectTrigger className="h-8">
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
                                   ))}
                                 </div>
                               </div>
                            </div>
                          ))}
                          
                          {subjectAssignments.length === 0 && (
                            <p className="text-sm text-muted-foreground">No subject assignments added yet.</p>
                          )}
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
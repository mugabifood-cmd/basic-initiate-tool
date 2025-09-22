import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';

export default function Auth() {
  const { user, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up Form State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'teacher' | 'headteacher'>('teacher');

  // Teacher assignments hook
  const teacherAssignments = useTeacherAssignments();

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
      subjectAssignments: teacherAssignments.subjectAssignments.map(sa => ({
        subjectId: sa.subjectId,
        classes: sa.classes.filter(slot => slot.className && slot.stream)
      })),
      classAssignment: teacherAssignments.classAssignment?.className && teacherAssignments.classAssignment?.stream 
        ? teacherAssignments.classAssignment 
        : null
    } : undefined;
    
    await signUp(signUpEmail, signUpPassword, signUpName, selectedRole, assignments);
    
    setIsLoading(false);
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
                      <h3 className="text-lg font-semibold">Teacher Assignments</h3>
                      
                      {/* Subject Teacher Assignments */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-medium">Subject Teacher</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={teacherAssignments.addSubjectAssignment}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Subject
                          </Button>
                        </div>
                        
                        {teacherAssignments.subjectAssignments.map((assignment) => (
                          <div key={assignment.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Select
                                value={assignment.subjectId}
                                onValueChange={(value) => teacherAssignments.updateSubjectAssignment(assignment.id, value)}
                              >
                                <SelectTrigger className="w-full max-w-xs">
                                  <SelectValue placeholder="Select subject" />
                                </SelectTrigger>
                                <SelectContent>
                                  {teacherAssignments.subjects
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
                                variant="ghost"
                                size="sm"
                                onClick={() => teacherAssignments.removeSubjectAssignment(assignment.id)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <Label className="text-sm font-medium">Classes & Streams</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => teacherAssignments.addClassSlot(assignment.id)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Class
                                </Button>
                              </div>
                              
                              <div className="space-y-2">
                                {assignment.classes.map((slot, slotIndex) => (
                                  <div key={slotIndex} className="flex gap-2 items-center">
                                    <Select
                                      value={slot.className}
                                      onValueChange={(value) => teacherAssignments.updateClassSlot(assignment.id, slotIndex, 'className', value)}
                                    >
                                      <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select class" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {teacherAssignments.classes
                                          .filter(Boolean)
                                          .map((className) => (
                                            <SelectItem key={className} value={className}>
                                              {className}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    <Select
                                      value={slot.stream}
                                      onValueChange={(value) => teacherAssignments.updateClassSlot(assignment.id, slotIndex, 'stream', value)}
                                      disabled={!slot.className}
                                    >
                                      <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select stream" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {teacherAssignments.streams
                                          .filter(stream => !teacherAssignments.isClassDisabledForSlot(assignment.id, slotIndex, slot.className, stream))
                                          .map((stream) => (
                                            <SelectItem key={stream} value={stream}>
                                              {stream}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                    
                                    {assignment.classes.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => teacherAssignments.removeClassSlot(assignment.id, slotIndex)}
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {teacherAssignments.subjectAssignments.length === 0 && (
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
                              value={teacherAssignments.classAssignment?.className || ""}
                              onValueChange={(value) => 
                                teacherAssignments.setClassAssignment(prev => 
                                  value ? { className: value, stream: prev?.stream || "" } : null
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select class" />
                              </SelectTrigger>
                              <SelectContent>
                                {teacherAssignments.classes
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
                              value={teacherAssignments.classAssignment?.stream || ""}
                              onValueChange={(value) => 
                                teacherAssignments.setClassAssignment(prev => 
                                  prev ? { ...prev, stream: value } : null
                                )
                              }
                              disabled={!teacherAssignments.classAssignment?.className}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select stream" />
                              </SelectTrigger>
                              <SelectContent>
                                {teacherAssignments.streams
                                  .filter(s => s && s.trim() !== '')
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
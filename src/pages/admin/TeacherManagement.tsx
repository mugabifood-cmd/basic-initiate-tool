import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Teacher {
  id: string;
  full_name: string;
  role: string;
  subject?: string;
  initials?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface TeacherAssignment {
  id: string;
  teacher_id: string;
  assignment_type: 'subject_teacher' | 'class_teacher';
  subject_id?: string;
  class_name?: string;
  stream?: string;
  subject?: { name: string; code: string };
}

interface TeacherWithAssignments extends Teacher {
  assignments: TeacherAssignment[];
}

export default function TeacherManagement() {
  const [teachers, setTeachers] = useState<TeacherWithAssignments[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithAssignments | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Edit form state
  const [subjectAssignments, setSubjectAssignments] = useState<Array<{
    id?: string;
    subjectId: string;
    classes: Array<{ className: string; stream: string }>;
  }>>([]);
  const [classAssignment, setClassAssignment] = useState<{
    id?: string;
    className: string;
    stream: string;
  } | null>(null);

  const classes = ['S1', 'S2', 'S3', 'S4'];
  const streams = ['East', 'West', 'All'];

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
  }, []);

  const fetchTeachers = async () => {
    try {
      // Fetch teachers
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher');

      if (teachersError) throw teachersError;

      // Fetch assignments for each teacher
      const teachersWithAssignments = await Promise.all(
        teachersData.map(async (teacher) => {
          const { data: assignments, error: assignmentsError } = await supabase
            .from('teacher_assignments')
            .select(`
              *,
              subject:subjects(name, code)
            `)
            .eq('teacher_id', teacher.id);

          if (assignmentsError) {
            console.error('Error fetching assignments:', assignmentsError);
            return { ...teacher, assignments: [] };
          }

          return { ...teacher, assignments: assignments || [] };
        })
      );

      setTeachers(teachersWithAssignments);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch teachers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name, code')
      .order('name');
    
    if (error) {
      console.error('Error fetching subjects:', error);
    } else {
      setSubjects(data || []);
    }
  };

  const openEditDialog = (teacher: TeacherWithAssignments) => {
    setEditingTeacher(teacher);
    
    // Parse existing assignments
    const subjectAssignments: any[] = [];
    let classAssignment: any = null;
    
    // Group subject assignments by subject
    const subjectGroups: { [key: string]: any } = {};
    
    teacher.assignments.forEach(assignment => {
      if (assignment.assignment_type === 'subject_teacher' && assignment.subject_id) {
        if (!subjectGroups[assignment.subject_id]) {
          subjectGroups[assignment.subject_id] = {
            subjectId: assignment.subject_id,
            classes: []
          };
        }
        subjectGroups[assignment.subject_id].classes.push({
          className: assignment.class_name!,
          stream: assignment.stream!
        });
      } else if (assignment.assignment_type === 'class_teacher') {
        classAssignment = {
          id: assignment.id,
          className: assignment.class_name!,
          stream: assignment.stream!
        };
      }
    });
    
    setSubjectAssignments(Object.values(subjectGroups));
    setClassAssignment(classAssignment);
    setIsEditDialogOpen(true);
  };

  const saveAssignments = async () => {
    if (!editingTeacher) return;
    
    try {
      // Delete existing assignments
      await supabase
        .from('teacher_assignments')
        .delete()
        .eq('teacher_id', editingTeacher.id);
      
      const newAssignments = [];
      
      // Add subject assignments
      for (const assignment of subjectAssignments) {
        for (const classInfo of assignment.classes) {
          newAssignments.push({
            teacher_id: editingTeacher.id,
            assignment_type: 'subject_teacher',
            subject_id: assignment.subjectId,
            class_name: classInfo.className,
            stream: classInfo.stream
          });
        }
      }
      
      // Add class assignment
      if (classAssignment && classAssignment.className && classAssignment.stream) {
        newAssignments.push({
          teacher_id: editingTeacher.id,
          assignment_type: 'class_teacher',
          class_name: classAssignment.className,
          stream: classAssignment.stream
        });
      }
      
      if (newAssignments.length > 0) {
        const { error } = await supabase
          .from('teacher_assignments')
          .insert(newAssignments);
        
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Assignments updated successfully"
      });
      
      setIsEditDialogOpen(false);
      fetchTeachers();
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast({
        title: "Error",
        description: "Failed to save assignments",
        variant: "destructive"
      });
    }
  };

  const deleteTeacherAssignments = async (teacherId: string) => {
    try {
      const { error } = await supabase
        .from('teacher_assignments')
        .delete()
        .eq('teacher_id', teacherId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Teacher assignments deleted successfully"
      });
      
      fetchTeachers();
    } catch (error) {
      console.error('Error deleting assignments:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignments",
        variant: "destructive"
      });
    }
  };

  const addSubjectAssignment = () => {
    setSubjectAssignments([...subjectAssignments, { subjectId: '', classes: [] }]);
  };

  const removeSubjectAssignment = (index: number) => {
    setSubjectAssignments(subjectAssignments.filter((_, i) => i !== index));
  };

  const updateSubjectAssignment = (index: number, subjectId: string) => {
    const updated = [...subjectAssignments];
    updated[index].subjectId = subjectId;
    setSubjectAssignments(updated);
  };

  const toggleClassForSubject = (assignmentIndex: number, className: string, stream: string) => {
    const updated = [...subjectAssignments];
    const existingClassIndex = updated[assignmentIndex].classes.findIndex(
      c => c.className === className && c.stream === stream
    );
    
    if (existingClassIndex >= 0) {
      updated[assignmentIndex].classes.splice(existingClassIndex, 1);
    } else {
      updated[assignmentIndex].classes.push({ className, stream });
    }
    
    setSubjectAssignments(updated);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Assignment Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Subject Assignments</TableHead>
                  <TableHead>Class Teacher</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => {
                  const subjectAssignments = teacher.assignments.filter(a => a.assignment_type === 'subject_teacher');
                  const classAssignment = teacher.assignments.find(a => a.assignment_type === 'class_teacher');
                  
                  return (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">{teacher.full_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {subjectAssignments.map((assignment, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {assignment.subject?.name} - {assignment.class_name} {assignment.stream}
                            </Badge>
                          ))}
                          {subjectAssignments.length === 0 && (
                            <span className="text-muted-foreground text-sm">No subject assignments</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {classAssignment ? (
                          <Badge variant="outline">
                            {classAssignment.class_name} {classAssignment.stream}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No class assignment</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(teacher)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTeacherAssignments(teacher.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Teacher Assignments - {editingTeacher?.full_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
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
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} ({subject.code})
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
                    <Label className="text-sm font-medium mb-2 block">Classes & Streams</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {classes.map((className) =>
                        streams.map((stream) => (
                          <div key={`${className}-${stream}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`subject-${index}-${className}-${stream}`}
                              checked={assignment.classes.some(
                                c => c.className === className && c.stream === stream
                              )}
                              onCheckedChange={() => toggleClassForSubject(index, className, stream)}
                            />
                            <Label
                              htmlFor={`subject-${index}-${className}-${stream}`}
                              className="text-sm"
                            >
                              {className} {stream}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {subjectAssignments.length === 0 && (
                <p className="text-sm text-muted-foreground">No subject assignments added yet.</p>
              )}
            </div>
            
            <Separator />
            
            {/* Class Teacher Assignment */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Class Teacher</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="class-teacher-class" className="text-sm">Class</Label>
                  <Select
                    value={classAssignment?.className || ''}
                    onValueChange={(value) => setClassAssignment(
                      value ? { ...classAssignment, className: value, stream: classAssignment?.stream || '' } : null
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {classes.map((className) => (
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
                    value={classAssignment?.stream || ''}
                    onValueChange={(value) => setClassAssignment(
                      classAssignment && value ? { ...classAssignment, stream: value } : null
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {streams.map((stream) => (
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
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAssignments}>
              Save Assignments
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
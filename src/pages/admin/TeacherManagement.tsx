import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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

interface Class {
  id: string;
  name: string;
  stream: string;
}

interface ClassSlot {
  className: string;
  stream: string;
}

interface TeacherAssignment {
  id: string;
  teacher_id: string;
  assignment_type: string;
  subject_id: string | null;
  class_name: string | null;
  stream: string | null;
  subject?: { name: string; code: string } | null;
}

interface TeacherWithAssignments extends Teacher {
  assignments: TeacherAssignment[];
}

export default function TeacherManagement() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherWithAssignments[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [availableStreams, setAvailableStreams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithAssignments | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Edit form state
  const [subjectAssignments, setSubjectAssignments] = useState<Array<{
    id?: string;
    subjectId: string;
    classSlots: ClassSlot[];
  }>>([]);
  const [classAssignment, setClassAssignment] = useState<{
    id?: string;
    className: string;
    stream: string;
  } | null>(null);

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
    fetchClasses();
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

          return { 
            ...teacher, 
            assignments: (assignments || []).map(assignment => ({
              ...assignment,
              assignment_type: assignment.assignment_type as 'subject_teacher' | 'class_teacher'
            }))
          };
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

  const fetchClasses = async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, stream')
      .order('name');
    
    if (error) {
      console.error('Error fetching classes:', error);
    } else {
      setClasses(data || []);
      // Extract unique streams
      const streams = [...new Set((data || []).map(c => c.stream))];
      setAvailableStreams(streams);
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
            classSlots: [{ className: '', stream: '' }, { className: '', stream: '' }, { className: '', stream: '' }, { className: '', stream: '' }]
          };
        }
        
        // Find the first empty slot and fill it
        const emptySlotIndex = subjectGroups[assignment.subject_id].classSlots.findIndex(
          (slot: ClassSlot) => !slot.className
        );
        if (emptySlotIndex !== -1) {
          subjectGroups[assignment.subject_id].classSlots[emptySlotIndex] = {
            className: assignment.class_name!,
            stream: assignment.stream!
          };
        }
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
        for (const slot of assignment.classSlots) {
          if (slot.className && slot.stream) {
            newAssignments.push({
              teacher_id: editingTeacher.id,
              assignment_type: 'subject_teacher',
              subject_id: assignment.subjectId,
              class_name: slot.className,
              stream: slot.stream
            });
          }
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
    setSubjectAssignments([...subjectAssignments, { 
      subjectId: '', 
      classSlots: [{ className: '', stream: '' }, { className: '', stream: '' }, { className: '', stream: '' }, { className: '', stream: '' }]
    }]);
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
    updated[assignmentIndex].classSlots[slotIndex][field] = value;
    setSubjectAssignments(updated);
  };

  const getUsedClasses = (currentAssignmentIndex: number, currentSlotIndex: number) => {
    const used = new Set<string>();
    
    // Add classes from other assignments
    subjectAssignments.forEach((assignment, assignmentIndex) => {
      if (assignmentIndex !== currentAssignmentIndex) {
        assignment.classSlots.forEach(slot => {
          if (slot.className) used.add(slot.className);
        });
      } else {
        // Add classes from other slots in the same assignment
        assignment.classSlots.forEach((slot, slotIndex) => {
          if (slotIndex !== currentSlotIndex && slot.className) {
            used.add(slot.className);
          }
        });
      }
    });
    
    // Add class teacher assignment
    if (classAssignment?.className) {
      used.add(classAssignment.className);
    }
    
    return used;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Teacher Assignment Management</h1>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      
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
                    <Label className="text-sm font-medium mb-3 block">Classes & Streams</Label>
                    <div className="space-y-3">
                      {assignment.classSlots.map((slot, slotIndex) => {
                        const usedClasses = getUsedClasses(index, slotIndex);
                        const availableClasses = classes.filter(cls => !usedClasses.has(cls.name) || cls.name === slot.className);
                        const selectedClass = classes.find(cls => cls.name === slot.className);
                        const availableStreamsForClass = selectedClass ? 
                          [...new Set(classes.filter(cls => cls.name === selectedClass.name).map(cls => cls.stream))] : 
                          [];
                        
                        return (
                          <div key={slotIndex} className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`class-${index}-${slotIndex}`} className="text-xs text-gray-600">
                                Class {slotIndex + 1}
                              </Label>
                              <Select
                                value={slot.className || "none"}
                                onValueChange={(value) => updateClassSlot(index, slotIndex, 'className', value === 'none' ? '' : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {availableClasses.map((cls) => (
                                    <SelectItem key={cls.name} value={cls.name}>
                                      {cls.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor={`stream-${index}-${slotIndex}`} className="text-xs text-gray-600">
                                Stream {slotIndex + 1}
                              </Label>
                              <Select
                                value={slot.stream || "none"}
                                onValueChange={(value) => updateClassSlot(index, slotIndex, 'stream', value === 'none' ? '' : value)}
                                disabled={!slot.className}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select stream" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {availableStreamsForClass.map((stream) => (
                                    <SelectItem key={stream} value={stream}>
                                      {stream}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
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
                    value={classAssignment?.className || 'none'}
                    onValueChange={(value) => setClassAssignment(
                      value !== 'none' ? { ...classAssignment, className: value, stream: classAssignment?.stream || '' } : null
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {[...new Set(classes.map(cls => cls.name))].map((className) => (
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
                    value={classAssignment?.stream || 'none'}
                    onValueChange={(value) => setClassAssignment(
                      classAssignment && value !== 'none' ? { ...classAssignment, stream: value } : null
                    )}
                    disabled={!classAssignment?.className}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {classAssignment?.className && 
                        [...new Set(classes.filter(cls => cls.name === classAssignment.className).map(cls => cls.stream))].map((stream) => (
                          <SelectItem key={stream} value={stream}>
                            {stream}
                          </SelectItem>
                        ))
                      }
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
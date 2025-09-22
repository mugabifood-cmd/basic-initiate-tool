import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Minus, Plus, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTeacherAssignments, type SubjectAssignment, type ClassAssignment } from "@/hooks/useTeacherAssignments";
import { Separator } from "@/components/ui/separator";

interface Teacher {
  id: string;
  full_name: string;
  user_id: string;
}

interface TeacherAssignmentDB {
  id: string;
  assignment_type: string;
  subject_id?: string;
  class_name?: string;
  stream?: string;
  subjects?: { name: string };
}

interface TeacherWithAssignments extends Teacher {
  assignments: TeacherAssignmentDB[];
}

const TeacherManagement = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<TeacherWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<TeacherWithAssignments | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const teacherAssignments = useTeacherAssignments();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          user_id,
          teacher_assignments (
            id,
            assignment_type,
            subject_id,
            class_name,
            stream,
            subjects (name)
          )
        `)
        .eq("role", "teacher");

      if (error) throw error;
      
      const teachersWithAssignments = data?.map(teacher => ({
        ...teacher,
        assignments: teacher.teacher_assignments || []
      })) || [];

      setTeachers(teachersWithAssignments);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("Failed to fetch teachers");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (teacher: TeacherWithAssignments) => {
    setEditingTeacher(teacher);
    
    // Group subject assignments by subject
    const subjectMap = new Map<string, Array<{ className: string; stream: string }>>();
    let classTeacherAssignment = null;
    
    teacher.assignments.forEach(assignment => {
      if (assignment.assignment_type === 'subject_teacher' && assignment.subject_id) {
        const classes = subjectMap.get(assignment.subject_id) || [];
        classes.push({
          className: assignment.class_name || '',
          stream: assignment.stream || ''
        });
        subjectMap.set(assignment.subject_id, classes);
      } else if (assignment.assignment_type === 'class_teacher') {
        classTeacherAssignment = {
          className: assignment.class_name || '',
          stream: assignment.stream || ''
        };
      }
    });
    
    const subjectAssignments = Array.from(subjectMap.entries()).map(([subjectId, classes]) => ({
      id: Date.now().toString() + Math.random().toString(),
      subjectId,
      classes
    }));
    
    // Set the assignments in the hook
    teacherAssignments.setAssignments(subjectAssignments, classTeacherAssignment);
    
    setEditDialogOpen(true);
  };

  const saveAssignments = async () => {
    if (!editingTeacher) return;

    try {
      // Delete existing assignments
      await deleteTeacherAssignments(editingTeacher.id);

      // Insert subject assignments
      for (const subjectAssignment of teacherAssignments.subjectAssignments) {
        if (!subjectAssignment.subjectId) continue;
        
        for (const classSlot of subjectAssignment.classes) {
          if (!classSlot.className || !classSlot.stream) continue;
          
          const { error } = await supabase
            .from("teacher_assignments")
            .insert({
              teacher_id: editingTeacher.id,
              assignment_type: "subject_teacher",
              subject_id: subjectAssignment.subjectId,
              class_name: classSlot.className,
              stream: classSlot.stream,
            });

          if (error) throw error;
        }
      }

      // Insert class teacher assignment
      if (teacherAssignments.classAssignment?.className && teacherAssignments.classAssignment?.stream) {
        const { error } = await supabase
          .from("teacher_assignments")
          .insert({
            teacher_id: editingTeacher.id,
            assignment_type: "class_teacher",
            class_name: teacherAssignments.classAssignment.className,
            stream: teacherAssignments.classAssignment.stream,
          });

        if (error) throw error;
      }

      toast.success("Teacher assignments updated successfully");
      setEditDialogOpen(false);
      fetchTeachers();
    } catch (error) {
      console.error("Error saving assignments:", error);
      toast.error("Failed to save assignments");
    }
  };

  const deleteTeacherAssignments = async (teacherId: string) => {
    try {
      const { error } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("teacher_id", teacherId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting assignments:", error);
      throw error;
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      await deleteTeacherAssignments(teacherId);
      toast.success("Teacher assignments deleted successfully");
      fetchTeachers();
    } catch (error) {
      toast.error("Failed to delete teacher assignments");
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Teacher Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teachers.map((teacher) => {
              const subjectAssignments = teacher.assignments.filter(a => a.assignment_type === 'subject_teacher');
              const classAssignment = teacher.assignments.find(a => a.assignment_type === 'class_teacher');
              
              return (
                <div key={teacher.id} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="font-medium">{teacher.full_name}</h3>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Subject Assignments:</p>
                        {subjectAssignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {subjectAssignments.map((assignment, index) => (
                              <span key={index} className="text-xs bg-secondary px-2 py-1 rounded">
                                {assignment.subjects?.name} - {assignment.class_name} {assignment.stream}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No subject assignments</span>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Class Teacher:</p>
                        {classAssignment ? (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {classAssignment.class_name} {classAssignment.stream}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No class assignment</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(teacher)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTeacher(teacher.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Teacher Assignments - {editingTeacher?.full_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Subject Assignments</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={teacherAssignments.addSubjectAssignment}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Subject
                </Button>
              </div>

              {teacherAssignments.subjectAssignments.map((assignment) => (
                <div key={assignment.id} className="border p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Subject</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => teacherAssignments.removeSubjectAssignment(assignment.id)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Select
                    value={assignment.subjectId}
                    onValueChange={(value) => teacherAssignments.updateSubjectAssignment(assignment.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherAssignments.subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
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
                    
                    {assignment.classes.map((classSlot, slotIndex) => (
                      <div key={slotIndex} className="flex gap-2 items-center">
                        <Select
                          value={classSlot.className}
                          onValueChange={(value) => teacherAssignments.updateClassSlot(assignment.id, slotIndex, "className", value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {teacherAssignments.classes.map((className) => (
                              <SelectItem key={className} value={className}>
                                {className}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={classSlot.stream}
                          onValueChange={(value) => teacherAssignments.updateClassSlot(assignment.id, slotIndex, "stream", value)}
                          disabled={!classSlot.className}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select stream" />
                          </SelectTrigger>
                          <SelectContent>
                            {teacherAssignments.streams
                              .filter(stream => !teacherAssignments.isClassDisabledForSlot(assignment.id, slotIndex, classSlot.className, stream))
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
              ))}

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Class Teacher Assignment (Optional)</Label>
                <div className="flex gap-2">
                  <Select
                    value={teacherAssignments.classAssignment?.className || ""}
                    onValueChange={(value) => 
                      teacherAssignments.setClassAssignment(prev => prev ? { ...prev, className: value } : { className: value, stream: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherAssignments.classes.map((className) => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={teacherAssignments.classAssignment?.stream || ""}
                    onValueChange={(value) => 
                      teacherAssignments.setClassAssignment(prev => prev ? { ...prev, stream: value } : { className: "", stream: value })
                    }
                    disabled={!teacherAssignments.classAssignment?.className}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stream" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherAssignments.streams.map((stream) => (
                        <SelectItem key={stream} value={stream}>
                          {stream}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveAssignments}>
                Save Assignments
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherManagement;
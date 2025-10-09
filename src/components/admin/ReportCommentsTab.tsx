import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GradeComment {
  id: string;
  grade: string;
  headteacher_comment: string;
  class_teacher_comment: string;
}

export default function ReportCommentsTab() {
  const [comments, setComments] = useState<GradeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComment, setEditingComment] = useState<GradeComment | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    grade: '',
    headteacher_comment: '',
    class_teacher_comment: ''
  });

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('grade_comments')
      .select('*')
      .order('grade');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch grade comments',
        variant: 'destructive'
      });
    } else {
      setComments(data || []);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingComment(null);
    setFormData({
      grade: '',
      headteacher_comment: '',
      class_teacher_comment: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (comment: GradeComment) => {
    setEditingComment(comment);
    setFormData({
      grade: comment.grade,
      headteacher_comment: comment.headteacher_comment,
      class_teacher_comment: comment.class_teacher_comment
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.grade || !formData.headteacher_comment || !formData.class_teacher_comment) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    if (editingComment) {
      const { error } = await supabase
        .from('grade_comments')
        .update({
          grade: formData.grade,
          headteacher_comment: formData.headteacher_comment,
          class_teacher_comment: formData.class_teacher_comment
        })
        .eq('id', editingComment.id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Success',
          description: `Comments for Grade ${formData.grade} have been successfully updated.`
        });
        setDialogOpen(false);
        fetchComments();
      }
    } else {
      const existingGrade = comments.find(c => c.grade.toUpperCase() === formData.grade.toUpperCase());
      if (existingGrade) {
        toast({
          title: 'Duplicate Grade',
          description: `Grade ${formData.grade} already exists. Please edit the existing entry.`,
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('grade_comments')
        .insert({
          grade: formData.grade,
          headteacher_comment: formData.headteacher_comment,
          class_teacher_comment: formData.class_teacher_comment
        });

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Success',
          description: `Comments for Grade ${formData.grade} have been successfully added.`
        });
        setDialogOpen(false);
        fetchComments();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (comment: GradeComment) => {
    if (!confirm(`Are you sure you want to delete comments for Grade ${comment.grade}?`)) {
      return;
    }

    const { error } = await supabase
      .from('grade_comments')
      .delete()
      .eq('id', comment.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Comments for Grade ${comment.grade} have been deleted.`
      });
      fetchComments();
    }
  };

  const grades = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Report Card Comments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set comments that appear on report cards based on student grades
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Comment
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No grade comments configured yet. Click "Add New Comment" to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Grade</TableHead>
              <TableHead>Headteacher Comment</TableHead>
              <TableHead>Class Teacher Comment</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comments.map((comment) => (
              <TableRow key={comment.id}>
                <TableCell className="font-bold text-lg">{comment.grade}</TableCell>
                <TableCell>{comment.headteacher_comment}</TableCell>
                <TableCell>{comment.class_teacher_comment}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(comment)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingComment ? 'Edit Grade Comment' : 'Add New Grade Comment'}
            </DialogTitle>
            <DialogDescription>
              {editingComment 
                ? 'Update the comments for this grade'
                : 'Add comments that will appear on report cards for this grade'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="grade">Grade</Label>
              {editingComment ? (
                <Input
                  id="grade"
                  value={formData.grade}
                  disabled
                  className="mt-1"
                />
              ) : (
                <Select
                  value={formData.grade}
                  onValueChange={(value) => setFormData({ ...formData, grade: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="headteacher">Headteacher Comment</Label>
              <Textarea
                id="headteacher"
                value={formData.headteacher_comment}
                onChange={(e) => setFormData({ ...formData, headteacher_comment: e.target.value })}
                rows={3}
                className="mt-1"
                placeholder="Enter headteacher comment for this grade"
              />
            </div>

            <div>
              <Label htmlFor="classteacher">Class Teacher Comment</Label>
              <Textarea
                id="classteacher"
                value={formData.class_teacher_comment}
                onChange={(e) => setFormData({ ...formData, class_teacher_comment: e.target.value })}
                rows={3}
                className="mt-1"
                placeholder="Enter class teacher comment for this grade"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

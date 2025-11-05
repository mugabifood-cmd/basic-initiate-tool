import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CommentTemplate {
  id: string;
  min_percentage: number;
  max_percentage: number;
  class_teacher_comment: string;
  headteacher_comment: string;
}

export default function CommentTemplatesTab() {
  const [templates, setTemplates] = useState<CommentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommentTemplate | null>(null);
  const [formData, setFormData] = useState({
    min_percentage: '',
    max_percentage: '',
    class_teacher_comment: '',
    headteacher_comment: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('comment_templates')
        .select('*')
        .order('min_percentage', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch comment templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTemplate(null);
    setFormData({
      min_percentage: '',
      max_percentage: '',
      class_teacher_comment: '',
      headteacher_comment: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (template: CommentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      min_percentage: template.min_percentage.toString(),
      max_percentage: template.max_percentage.toString(),
      class_teacher_comment: template.class_teacher_comment,
      headteacher_comment: template.headteacher_comment
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const minPercentage = parseInt(formData.min_percentage);
      const maxPercentage = parseInt(formData.max_percentage);

      if (isNaN(minPercentage) || isNaN(maxPercentage)) {
        toast({
          title: 'Validation Error',
          description: 'Percentages must be valid numbers',
          variant: 'destructive'
        });
        return;
      }

      if (minPercentage < 0 || maxPercentage > 100 || minPercentage >= maxPercentage) {
        toast({
          title: 'Validation Error',
          description: 'Invalid percentage range (0-100, min must be less than max)',
          variant: 'destructive'
        });
        return;
      }

      if (!formData.class_teacher_comment.trim() || !formData.headteacher_comment.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Both comments are required',
          variant: 'destructive'
        });
        return;
      }

      const templateData = {
        min_percentage: minPercentage,
        max_percentage: maxPercentage,
        class_teacher_comment: formData.class_teacher_comment.trim(),
        headteacher_comment: formData.headteacher_comment.trim()
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('comment_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Comment template updated successfully'
        });
      } else {
        const { error } = await supabase
          .from('comment_templates')
          .insert([templateData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Comment template added successfully'
        });
      }

      setDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save comment template',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment template?')) return;

    try {
      const { error } = await supabase
        .from('comment_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Comment template deleted successfully'
      });

      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete comment template',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Comment Templates</h3>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Comment Template
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure automatic comments based on student performance
      </p>

      <Tabs defaultValue="class-teacher" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="class-teacher">Class Teacher Comments</TabsTrigger>
          <TabsTrigger value="headteacher">Headteacher Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="class-teacher" className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score Range (%)</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No comment templates found
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.min_percentage}% - {template.max_percentage}%
                    </TableCell>
                    <TableCell>{template.class_teacher_comment}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="headteacher" className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score Range (%)</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No comment templates found
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.min_percentage}% - {template.max_percentage}%
                    </TableCell>
                    <TableCell>{template.headteacher_comment}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Comment Template' : 'Add Comment Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_percentage">Minimum Percentage</Label>
                <Input
                  id="min_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.min_percentage}
                  onChange={(e) => setFormData({ ...formData, min_percentage: e.target.value })}
                  placeholder="e.g., 80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_percentage">Maximum Percentage</Label>
                <Input
                  id="max_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.max_percentage}
                  onChange={(e) => setFormData({ ...formData, max_percentage: e.target.value })}
                  placeholder="e.g., 100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class_teacher_comment">Class Teacher Comment</Label>
              <Textarea
                id="class_teacher_comment"
                value={formData.class_teacher_comment}
                onChange={(e) => setFormData({ ...formData, class_teacher_comment: e.target.value })}
                placeholder="Enter class teacher comment"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="headteacher_comment">Headteacher Comment</Label>
              <Textarea
                id="headteacher_comment"
                value={formData.headteacher_comment}
                onChange={(e) => setFormData({ ...formData, headteacher_comment: e.target.value })}
                placeholder="Enter headteacher comment"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

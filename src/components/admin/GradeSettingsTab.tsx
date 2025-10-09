import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface GradeBoundary {
  id: string;
  grade: string;
  min_score: number;
  max_score: number;
}

export default function GradeSettingsTab() {
  const [boundaries, setBoundaries] = useState<GradeBoundary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoundary, setEditingBoundary] = useState<GradeBoundary | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    grade: '',
    min_score: '',
    max_score: ''
  });

  useEffect(() => {
    fetchBoundaries();
  }, []);

  const fetchBoundaries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('grade_boundaries')
      .select('*')
      .order('min_score', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch grade boundaries',
        variant: 'destructive'
      });
    } else {
      setBoundaries(data || []);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    setEditingBoundary(null);
    setFormData({
      grade: '',
      min_score: '',
      max_score: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (boundary: GradeBoundary) => {
    setEditingBoundary(boundary);
    setFormData({
      grade: boundary.grade,
      min_score: boundary.min_score.toString(),
      max_score: boundary.max_score.toString()
    });
    setDialogOpen(true);
  };

  const checkOverlap = (minScore: number, maxScore: number, excludeId?: string) => {
    return boundaries.some(b => {
      if (excludeId && b.id === excludeId) return false;
      return (minScore >= b.min_score && minScore <= b.max_score) ||
             (maxScore >= b.min_score && maxScore <= b.max_score) ||
             (minScore <= b.min_score && maxScore >= b.max_score);
    });
  };

  const handleSave = async () => {
    const minScore = parseFloat(formData.min_score);
    const maxScore = parseFloat(formData.max_score);

    if (!formData.grade || isNaN(minScore) || isNaN(maxScore)) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required and scores must be valid numbers',
        variant: 'destructive'
      });
      return;
    }

    if (minScore < 0 || maxScore > 100 || minScore >= maxScore) {
      toast({
        title: 'Validation Error',
        description: 'Min score must be less than max score, and scores must be between 0 and 100',
        variant: 'destructive'
      });
      return;
    }

    if (checkOverlap(minScore, maxScore, editingBoundary?.id)) {
      toast({
        title: 'Validation Error',
        description: 'This score range overlaps with an existing grade boundary',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);

    if (editingBoundary) {
      const { error } = await supabase
        .from('grade_boundaries')
        .update({
          grade: formData.grade,
          min_score: minScore,
          max_score: maxScore
        })
        .eq('id', editingBoundary.id);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Success',
          description: `Grading for Grade ${formData.grade} has been successfully updated.`
        });
        setDialogOpen(false);
        fetchBoundaries();
      }
    } else {
      const existingGrade = boundaries.find(b => b.grade.toUpperCase() === formData.grade.toUpperCase());
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
        .from('grade_boundaries')
        .insert({
          grade: formData.grade,
          min_score: minScore,
          max_score: maxScore
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
          description: `Grading for Grade ${formData.grade} has been successfully added.`
        });
        setDialogOpen(false);
        fetchBoundaries();
      }
    }

    setSaving(false);
  };

  const handleDelete = async (boundary: GradeBoundary) => {
    if (!confirm(`Are you sure you want to delete Grade ${boundary.grade} boundaries?`)) {
      return;
    }

    const { error } = await supabase
      .from('grade_boundaries')
      .delete()
      .eq('id', boundary.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete grade boundary',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Grade ${boundary.grade} boundaries have been deleted.`
      });
      fetchBoundaries();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Grade Boundaries</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define the score ranges for each grade
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Grade
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : boundaries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No grade boundaries configured yet. Click "Add New Grade" to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Grade</TableHead>
              <TableHead>Minimum Score</TableHead>
              <TableHead>Maximum Score</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boundaries.map((boundary) => (
              <TableRow key={boundary.id}>
                <TableCell className="font-bold text-lg">{boundary.grade}</TableCell>
                <TableCell>{boundary.min_score}</TableCell>
                <TableCell>{boundary.max_score}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(boundary)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(boundary)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBoundary ? 'Edit Grade Boundary' : 'Add New Grade Boundary'}
            </DialogTitle>
            <DialogDescription>
              {editingBoundary 
                ? 'Update the score range for this grade'
                : 'Define the score range for a new grade'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value.toUpperCase() })}
                placeholder="e.g., A, B, C"
                className="mt-1"
                disabled={!!editingBoundary}
              />
            </div>

            <div>
              <Label htmlFor="min_score">Minimum Score</Label>
              <Input
                id="min_score"
                type="number"
                value={formData.min_score}
                onChange={(e) => setFormData({ ...formData, min_score: e.target.value })}
                placeholder="e.g., 90"
                min="0"
                max="100"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="max_score">Maximum Score</Label>
              <Input
                id="max_score"
                type="number"
                value={formData.max_score}
                onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
                placeholder="e.g., 100"
                min="0"
                max="100"
                className="mt-1"
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

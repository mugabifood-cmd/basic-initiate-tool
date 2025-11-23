import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Submission {
  id: string;
  a1_score: number;
  a2_score: number;
  a3_score: number;
  percentage_20: number;
  percentage_80: number;
  percentage_100: number;
  average_score: number;
  grade: string;
  teacher_comment: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  remarks: string;
  students: {
    full_name: string;
    student_number: string;
  } | null;
  subjects: {
    code: string;
    name: string;
  } | null;
  classes: {
    name: string;
    stream: string;
  } | null;
  profiles: {
    initials: string;
  } | null;
}

export default function MySubmissions() {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [editForm, setEditForm] = useState({
    a1_score: '',
    a2_score: '',
    a3_score: '',
    percentage_20: '',
    percentage_80: '',
    percentage_100: '',
    teacher_initials: '',
    identifier: '1',
    teacher_comment: ''
  });
  const [gradeBoundaries, setGradeBoundaries] = useState<Array<{
    grade: string;
    min_score: number;
    max_score: number;
  }>>([]);

  useEffect(() => {
    if (profile) {
      fetchSubmissions();
      fetchGradeBoundaries();
    }
  }, [profile]);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_submissions')
        .select(`
          *,
          students!inner (
            full_name,
            student_number
          ),
          subjects!inner (
            code,
            name
          ),
          classes!inner (
            name,
            stream
          ),
          profiles!subject_submissions_teacher_id_fkey (
            initials
          )
        `)
        .eq('teacher_id', profile?.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      
      setSubmissions((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching submissions",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGradeBoundaries = async () => {
    try {
      const { data, error } = await supabase
        .from('grade_boundaries')
        .select('*')
        .order('min_score', { ascending: false });
      
      if (error) throw error;
      setGradeBoundaries(data || []);
    } catch (error: any) {
      console.error("Error fetching grade boundaries:", error.message);
    }
  };

  const calculateGrade = (avg: number) => {
    for (const boundary of gradeBoundaries) {
      if (avg >= boundary.min_score && avg <= boundary.max_score) {
        return boundary.grade;
      }
    }
    return 'F';
  };

  const calculateAchievementLevel = (avg: number) => {
    if (avg >= 90) return 'Outstanding';
    if (avg >= 75) return 'Exceptional';
    if (avg >= 60) return 'Satisfactory';
    return 'Basic';
  };

  const getIdentifierFromAchievement = (achievement: string) => {
    if (achievement === 'Outstanding') return '3';
    if (achievement === 'Exceptional') return '2';
    return '1';
  };

  const handleEdit = (submission: Submission) => {
    setSelectedSubmission(submission);
    const achievement = calculateAchievementLevel(submission.percentage_100);
    setEditForm({
      a1_score: submission.a1_score.toString(),
      a2_score: submission.a2_score.toString(),
      a3_score: submission.a3_score.toString(),
      percentage_20: submission.percentage_20?.toString() || '',
      percentage_80: submission.percentage_80?.toString() || '',
      percentage_100: submission.percentage_100?.toString() || '',
      teacher_initials: submission.profiles?.initials || '',
      identifier: getIdentifierFromAchievement(achievement),
      teacher_comment: submission.teacher_comment || ''
    });
    setEditDialogOpen(true);
  };

  const handlePreview = (submission: Submission) => {
    setSelectedSubmission(submission);
    setPreviewDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSubmission) return;

    // Validate all required fields
    if (!editForm.a1_score || !editForm.a2_score || !editForm.a3_score || 
        !editForm.percentage_20 || !editForm.percentage_80 || !editForm.percentage_100 || 
        !editForm.teacher_initials) {
      toast({
        title: "Incomplete Fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Validate all score fields are valid numbers (integers or decimals)
    const numberPattern = /^\d+(\.\d+)?$/;
    const scoresToCheck = [
      editForm.a1_score,
      editForm.a2_score,
      editForm.a3_score,
      editForm.percentage_20,
      editForm.percentage_80,
      editForm.percentage_100,
    ];
    const hasInvalidScore = scoresToCheck.some((score) => !numberPattern.test(score));
    if (hasInvalidScore) {
      toast({
        title: "Invalid Score Format",
        description: "Scores must be valid numbers (e.g., 85 or 85.5).",
        variant: "destructive"
      });
      return;
    }

    try {
      const a1 = parseFloat(editForm.a1_score);
      const a2 = parseFloat(editForm.a2_score);
      const a3 = parseFloat(editForm.a3_score);
      const perc20 = parseFloat(editForm.percentage_20);
      const perc80 = parseFloat(editForm.percentage_80);
      const perc100 = parseFloat(editForm.percentage_100);
      
      // Calculate average from A scores
      const avg = parseFloat(((a1 + a2 + a3) / 3).toFixed(2));
      
      // Calculate grade and achievement based on percentage_100
      const grade = calculateGrade(perc100);
      const achievement = calculateAchievementLevel(perc100);

      const { error } = await supabase
        .from('subject_submissions')
        .update({
          a1_score: a1,
          a2_score: a2,
          a3_score: a3,
          percentage_20: perc20,
          percentage_80: perc80,
          percentage_100: perc100,
          average_score: avg,
          grade: grade,
          remarks: editForm.identifier,
          teacher_comment: editForm.teacher_comment
        })
        .eq('id', selectedSubmission.id)
        .eq('teacher_id', profile?.id);

      if (error) throw error;

      // Update teacher initials if changed
      if (editForm.teacher_initials !== profile?.initials) {
        await supabase
          .from('profiles')
          .update({ initials: editForm.teacher_initials })
          .eq('id', profile?.id);
      }

      toast({
        title: "Submission Updated",
        description: "The submission has been updated successfully"
      });

      setEditDialogOpen(false);
      fetchSubmissions();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (submissionId: string) => {
    try {
      const { data, error } = await supabase
        .from('subject_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('teacher_id', profile?.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Delete Failed",
          description: "Could not delete this submission. You don't have permission.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Submission Deleted",
        description: "The submission has been deleted successfully"
      });

      fetchSubmissions();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">My Submissions</h1>
            </div>
            <Link to="/teacher/submissions">
              <Button>Submit New Marks</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>My Mark Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No submissions found.</p>
                <p className="text-sm">Start by submitting marks for your students.</p>
                <Link to="/teacher/submissions" className="mt-4 inline-block">
                  <Button>Submit Marks</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Scores</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{submission.students?.full_name}</div>
                            <div className="text-sm text-gray-500">{submission.students?.student_number}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{submission.subjects?.code}</div>
                            <div className="text-sm text-gray-500">{submission.subjects?.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {submission.classes?.name} {submission.classes?.stream}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>A1: {submission.a1_score}</div>
                            <div>A2: {submission.a2_score}</div>
                            <div>A3: {submission.a3_score}</div>
                            <div className="font-medium">Total: {submission.percentage_100}%</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{submission.grade}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(submission.submitted_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {submission.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEdit(submission)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this submission? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(submission.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePreview(submission)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Submission</DialogTitle>
              <DialogDescription>
                Update the scores for {selectedSubmission?.students?.full_name} - {selectedSubmission?.subjects?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-a1">A1 Score</Label>
                  <Input
                    id="edit-a1"
                    type="text"
                    value={editForm.a1_score}
                    onChange={(e) => setEditForm({ ...editForm, a1_score: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-a2">A2 Score</Label>
                  <Input
                    id="edit-a2"
                    type="text"
                    value={editForm.a2_score}
                    onChange={(e) => setEditForm({ ...editForm, a2_score: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-a3">A3 Score</Label>
                  <Input
                    id="edit-a3"
                    type="text"
                    value={editForm.a3_score}
                    onChange={(e) => setEditForm({ ...editForm, a3_score: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-perc20">20% Score</Label>
                  <Input
                    id="edit-perc20"
                    type="text"
                    value={editForm.percentage_20}
                    onChange={(e) => setEditForm({ ...editForm, percentage_20: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-perc80">80% Score</Label>
                  <Input
                    id="edit-perc80"
                    type="text"
                    value={editForm.percentage_80}
                    onChange={(e) => setEditForm({ ...editForm, percentage_80: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-perc100">100% Score</Label>
                  <Input
                    id="edit-perc100"
                    type="text"
                    value={editForm.percentage_100}
                    onChange={(e) => setEditForm({ ...editForm, percentage_100: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-initials">Teacher Initials</Label>
                  <Input
                    id="edit-initials"
                    type="text"
                    value={editForm.teacher_initials}
                    onChange={(e) => setEditForm({ ...editForm, teacher_initials: e.target.value })}
                    placeholder="e.g., JD"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-identifier">Achievement Level</Label>
                  <Select
                    value={editForm.identifier}
                    onValueChange={(value) => setEditForm({ ...editForm, identifier: value })}
                  >
                    <SelectTrigger id="edit-identifier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Basic</SelectItem>
                      <SelectItem value="2">2 - Moderate</SelectItem>
                      <SelectItem value="3">3 - Outstanding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Calculated Values (Auto-calculated)</Label>
                <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-md">
                  <div>
                    <p className="text-xs text-muted-foreground">AVG</p>
                    <p className="font-medium">
                      {editForm.a1_score && editForm.a2_score && editForm.a3_score
                        ? ((parseFloat(editForm.a1_score) + parseFloat(editForm.a2_score) + parseFloat(editForm.a3_score)) / 3).toFixed(2)
                        : '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Grade</p>
                    <p className="font-medium">
                      {editForm.percentage_100 ? calculateGrade(parseFloat(editForm.percentage_100)) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Achievement</p>
                    <p className="font-medium">
                      {editForm.percentage_100 ? calculateAchievementLevel(parseFloat(editForm.percentage_100)) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-comment">Teacher Comment (Optional)</Label>
                <Textarea
                  id="edit-comment"
                  value={editForm.teacher_comment}
                  onChange={(e) => setEditForm({ ...editForm, teacher_comment: e.target.value })}
                  rows={3}
                  placeholder="Add any comments about the student's performance..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submission Details</DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Student</Label>
                    <p className="font-medium">{selectedSubmission.students?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedSubmission.students?.student_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Subject</Label>
                    <p className="font-medium">{selectedSubmission.subjects?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedSubmission.subjects?.code}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Class</Label>
                    <p className="font-medium">
                      {selectedSubmission.classes?.name} {selectedSubmission.classes?.stream}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(selectedSubmission.status)}>
                        {selectedSubmission.status.charAt(0).toUpperCase() + selectedSubmission.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-muted-foreground mb-2 block">A Scores</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">A1 Score</p>
                      <p className="text-2xl font-bold">{selectedSubmission.a1_score}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">A2 Score</p>
                      <p className="text-2xl font-bold">{selectedSubmission.a2_score}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">A3 Score</p>
                      <p className="text-2xl font-bold">{selectedSubmission.a3_score}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-muted-foreground mb-2 block">Percentage Scores</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">20% Score</p>
                      <p className="text-2xl font-bold">{selectedSubmission.percentage_20}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">80% Score</p>
                      <p className="text-2xl font-bold">{selectedSubmission.percentage_80}</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">100% Score</p>
                      <p className="text-2xl font-bold">{selectedSubmission.percentage_100}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">{selectedSubmission.average_score}</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Grade</p>
                    <p className="text-2xl font-bold">{selectedSubmission.grade}</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Teacher Initials</p>
                    <p className="text-2xl font-bold">{selectedSubmission.profiles?.initials || 'N/A'}</p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Achievement</p>
                    <p className="text-lg font-bold">
                      {calculateAchievementLevel(selectedSubmission.percentage_100)}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Teacher Comment</Label>
                  <p className="mt-1 p-3 bg-muted/50 rounded-lg">{selectedSubmission.teacher_comment}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Submitted At</Label>
                    <p>{new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                  </div>
                  {selectedSubmission.reviewed_at && (
                    <div>
                      <Label className="text-muted-foreground">Reviewed At</Label>
                      <p>{new Date(selectedSubmission.reviewed_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setPreviewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
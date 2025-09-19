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

interface Submission {
  id: string;
  a1_score: number;
  a2_score: number;
  a3_score: number;
  percentage_100: number;
  average_score: number;
  grade: string;
  teacher_comment: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
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
}

export default function MySubmissions() {
  const { profile } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchSubmissions();
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

  const handleDelete = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('subject_submissions')
        .delete()
        .eq('id', submissionId)
        .eq('teacher_id', profile?.id)
        .eq('status', 'pending'); // Only allow deletion of pending submissions

      if (error) throw error;

      toast({
        title: "Submission Deleted",
        description: "The submission has been deleted successfully"
      });

      fetchSubmissions(); // Refresh the list
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                              <>
                                <Button variant="outline" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
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
                              </>
                            )}
                            <Button variant="outline" size="sm">
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
      </main>
    </div>
  );
}
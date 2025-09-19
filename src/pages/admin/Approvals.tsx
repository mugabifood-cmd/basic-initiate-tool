import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Submission {
  id: string;
  a1_score: number;
  a2_score: number;
  a3_score: number;
  average_score: number;
  percentage_20: number;
  percentage_80: number;
  percentage_100: number;
  grade: string;
  remarks: string;
  teacher_comment: string;
  status: string;
  submitted_at: string;
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
    schools: {
      name: string;
    } | null;
  } | null;
  profiles: {
    full_name: string;
    initials: string;
  } | null;
}

export default function Approvals() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      
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
            stream,
            schools!inner (
              name
            )
          ),
          profiles!inner (
            full_name,
            initials
          )
        `)
        .eq('status', 'pending')
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

  const handleApproval = async (submissionId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('subject_submissions')
        .update({
          status: approve ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: approve ? "Submission approved" : "Submission rejected",
        description: approve 
          ? "The submission has been approved successfully."
          : "The submission has been rejected."
      });

      // If approved, trigger report card generation
      if (approve) {
        // TODO: Implement report card generation logic
        console.log('Triggering report card generation for submission:', submissionId);
      }

      fetchSubmissions();
    } catch (error: any) {
      toast({
        title: "Error updating submission",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      case 'D': return 'bg-orange-100 text-orange-800';
      case 'E': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
              <h1 className="text-xl font-semibold text-gray-900">Approve Submissions</h1>
            </div>
            <Badge variant="secondary">
              {submissions.length} Pending Approval{submissions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Pending Teacher Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No pending submissions to review.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{submission.students.full_name}</div>
                          <div className="text-sm text-gray-500">{submission.students.student_number}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{submission.subjects.code}</div>
                          <div className="text-sm text-gray-500">{submission.subjects.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{submission.classes.name} {submission.classes.stream}</div>
                          <div className="text-sm text-gray-500">{submission.classes.schools.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{submission.profiles.full_name}</div>
                          <div className="text-sm text-gray-500">({submission.profiles.initials})</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getGradeColor(submission.grade)}>
                          {submission.grade}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-1">
                          {submission.percentage_100}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {new Date(submission.submitted_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedSubmission(submission)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Submission Details</DialogTitle>
                              </DialogHeader>
                              {selectedSubmission && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold">Student</h4>
                                      <p>{selectedSubmission.students.full_name}</p>
                                      <p className="text-sm text-gray-500">{selectedSubmission.students.student_number}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold">Subject</h4>
                                      <p>{selectedSubmission.subjects.code} - {selectedSubmission.subjects.name}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-semibold mb-2">Assessment Scores</h4>
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="font-medium">A1</p>
                                        <p>{selectedSubmission.a1_score}</p>
                                      </div>
                                      <div>
                                        <p className="font-medium">A2</p>
                                        <p>{selectedSubmission.a2_score}</p>
                                      </div>
                                      <div>
                                        <p className="font-medium">A3</p>
                                        <p>{selectedSubmission.a3_score}</p>
                                      </div>
                                      <div>
                                        <p className="font-medium">Average</p>
                                        <p>{selectedSubmission.average_score}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold mb-2">Percentages & Grade</h4>
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="font-medium">20%</p>
                                        <p>{selectedSubmission.percentage_20}%</p>
                                      </div>
                                      <div>
                                        <p className="font-medium">80%</p>
                                        <p>{selectedSubmission.percentage_80}%</p>
                                      </div>
                                      <div>
                                        <p className="font-medium">100%</p>
                                        <p>{selectedSubmission.percentage_100}%</p>
                                      </div>
                                      <div>
                                        <p className="font-medium">Grade</p>
                                        <Badge className={getGradeColor(selectedSubmission.grade)}>
                                          {selectedSubmission.grade}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold">Remarks</h4>
                                    <p>{selectedSubmission.remarks}</p>
                                  </div>

                                  {selectedSubmission.teacher_comment && (
                                    <div>
                                      <h4 className="font-semibold">Teacher Comment</h4>
                                      <p>{selectedSubmission.teacher_comment}</p>
                                    </div>
                                  )}

                                  <div className="flex justify-end space-x-2 pt-4">
                                    <Button 
                                      variant="destructive"
                                      onClick={() => handleApproval(selectedSubmission.id, false)}
                                    >
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Reject
                                    </Button>
                                    <Button 
                                      onClick={() => handleApproval(selectedSubmission.id, true)}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Approve
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleApproval(submission.id, false)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleApproval(submission.id, true)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
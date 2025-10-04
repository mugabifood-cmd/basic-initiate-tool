import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Eye, Edit, Trash2, Printer, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ReportCard {
  id: string;
  student_id: string;
  class_id: string;
  status: string;
  overall_average: number;
  overall_grade: string;
  generated_at: string;
  created_at: string;
  students: {
    full_name: string;
    student_number: string;
  };
  classes: {
    name: string;
    stream: string;
    academic_year: string;
    term: string;
  };
}

export default function ReportManagement() {
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchReportCards();
  }, []);

  const fetchReportCards = async () => {
    try {
      const { data, error } = await supabase
        .from('report_cards')
        .select(`
          *,
          students (
            full_name,
            student_number
          ),
          classes (
            name,
            stream,
            academic_year,
            term
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReportCards((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error loading report cards",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeleting(id);
      const { error } = await supabase
        .from('report_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Report card deleted",
        description: "The report card has been successfully deleted."
      });

      // Refresh the list
      fetchReportCards();
    } catch (error: any) {
      toast({
        title: "Error deleting report card",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const handlePreview = (reportCard: ReportCard) => {
    // TODO: Implement preview modal
    toast({
      title: "Preview",
      description: "Preview functionality coming soon"
    });
  };

  const handleEdit = (reportCard: ReportCard) => {
    // TODO: Implement edit modal
    toast({
      title: "Edit",
      description: "Edit functionality coming soon"
    });
  };

  const handlePrint = (reportCard: ReportCard) => {
    // TODO: Implement print functionality
    toast({
      title: "Print",
      description: "Print functionality coming soon"
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'draft':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
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
              <h1 className="text-xl font-semibold text-gray-900">Report Card Management</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Report Cards</span>
              <Badge variant="outline">
                <FileText className="w-3 h-3 mr-1" />
                {reportCards.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportCards.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No report cards generated yet.</p>
                <p className="text-sm">Generated report cards will appear here with Preview, Edit, Delete, and Print options.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student Number</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportCards.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.students.full_name}
                        </TableCell>
                        <TableCell>{report.students.student_number}</TableCell>
                        <TableCell>
                          {report.classes.name} {report.classes.stream}
                        </TableCell>
                        <TableCell>
                          {report.classes.term} {report.classes.academic_year}
                        </TableCell>
                        <TableCell>
                          {report.overall_average?.toFixed(1) || 'N/A'}%
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.overall_grade || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(report.status)}>
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.generated_at 
                            ? format(new Date(report.generated_at), 'MMM dd, yyyy')
                            : format(new Date(report.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreview(report)}
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(report)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrint(report)}
                              title="Print"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={deleting === report.id}
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Report Card</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this report card for {report.students.full_name}? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(report.id)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
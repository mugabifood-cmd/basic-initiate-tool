import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Eye, Edit, Trash2, Printer, FileText, Download, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import ReportCardPreview from '@/components/ReportCardPreview';

interface ReportCard {
  id: string;
  student_id: string;
  class_id: string;
  status: string;
  overall_average: number;
  overall_grade: string;
  generated_at: string;
  created_at: string;
  class_teacher_comment?: string;
  headteacher_comment?: string;
  overall_achievement?: string;
  term_ended_on?: string;
  next_term_begins?: string;
  fees_balance?: number;
  fees_next_term?: number;
  other_requirements?: string;
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ReportCard | null>(null);
  const [saving, setSaving] = useState(false);

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
    setSelectedReportId(reportCard.id);
    setPreviewOpen(true);
  };

  const handleEdit = (reportCard: ReportCard) => {
    setEditingReport(reportCard);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('report_cards')
        .update({
          class_teacher_comment: editingReport.class_teacher_comment,
          headteacher_comment: editingReport.headteacher_comment,
          overall_achievement: editingReport.overall_achievement,
          term_ended_on: editingReport.term_ended_on,
          next_term_begins: editingReport.next_term_begins,
          fees_balance: editingReport.fees_balance,
          fees_next_term: editingReport.fees_next_term,
          other_requirements: editingReport.other_requirements,
          status: editingReport.status
        })
        .eq('id', editingReport.id);

      if (error) throw error;

      toast({
        title: "Report card updated",
        description: "Changes have been saved successfully"
      });

      setEditOpen(false);
      fetchReportCards();
    } catch (error: any) {
      toast({
        title: "Error saving changes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (reportCard: ReportCard) => {
    // TODO: Implement print functionality
    toast({
      title: "Print",
      description: "Print functionality coming soon"
    });
  };

  const handleDownload = async (reportCard: ReportCard) => {
    try {
      setSelectedReportId(reportCard.id);
      setPreviewOpen(true);
      
      // Wait for dialog to render
      setTimeout(async () => {
        const element = document.getElementById('report-card-preview');
        if (!element) {
          toast({
            title: "Error",
            description: "Could not find report card to download",
            variant: "destructive"
          });
          return;
        }

        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${reportCard.students.full_name}_Report_Card.pdf`);

        setPreviewOpen(false);
        
        toast({
          title: "Download complete",
          description: "Report card has been downloaded successfully"
        });
      }, 500);
    } catch (error: any) {
      toast({
        title: "Error downloading report",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleShare = async (reportCard: ReportCard) => {
    try {
      if (!navigator.share) {
        toast({
          title: "Share not supported",
          description: "Your browser doesn't support the share feature",
          variant: "destructive"
        });
        return;
      }

      await navigator.share({
        title: `Report Card - ${reportCard.students.full_name}`,
        text: `Report card for ${reportCard.students.full_name} - ${reportCard.classes.name} ${reportCard.classes.stream}`,
        url: window.location.href
      });

      toast({
        title: "Shared successfully",
        description: "Report card link has been shared"
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: "Error sharing",
          description: error.message,
          variant: "destructive"
        });
      }
    }
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(report)}
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShare(report)}
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Card Preview</DialogTitle>
          </DialogHeader>
          {selectedReportId && <ReportCardPreview reportId={selectedReportId} />}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Report Card</DialogTitle>
          </DialogHeader>
          {editingReport && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <Input 
                  value={`${editingReport.students.full_name} (${editingReport.students.student_number})`} 
                  disabled 
                />
              </div>

              <div className="space-y-2">
                <Label>Class</Label>
                <Input 
                  value={`${editingReport.classes.name} ${editingReport.classes.stream}`} 
                  disabled 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={editingReport.status} 
                  onValueChange={(value) => setEditingReport({...editingReport, status: value})}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="term_ended">Term Ended On</Label>
                  <Input 
                    id="term_ended"
                    type="date" 
                    value={editingReport.term_ended_on || ''} 
                    onChange={(e) => setEditingReport({...editingReport, term_ended_on: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next_term">Next Term Begins</Label>
                  <Input 
                    id="next_term"
                    type="date" 
                    value={editingReport.next_term_begins || ''} 
                    onChange={(e) => setEditingReport({...editingReport, next_term_begins: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fees_balance">Fees Balance</Label>
                  <Input 
                    id="fees_balance"
                    type="number" 
                    step="0.01"
                    value={editingReport.fees_balance || ''} 
                    onChange={(e) => setEditingReport({...editingReport, fees_balance: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fees_next_term">Fees Next Term</Label>
                  <Input 
                    id="fees_next_term"
                    type="number" 
                    step="0.01"
                    value={editingReport.fees_next_term || ''} 
                    onChange={(e) => setEditingReport({...editingReport, fees_next_term: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class_teacher_comment">Class Teacher's Comment</Label>
                <Textarea 
                  id="class_teacher_comment"
                  value={editingReport.class_teacher_comment || ''} 
                  onChange={(e) => setEditingReport({...editingReport, class_teacher_comment: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="headteacher_comment">Head Teacher's Comment</Label>
                <Textarea 
                  id="headteacher_comment"
                  value={editingReport.headteacher_comment || ''} 
                  onChange={(e) => setEditingReport({...editingReport, headteacher_comment: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="overall_achievement">Overall Achievement</Label>
                <Textarea 
                  id="overall_achievement"
                  value={editingReport.overall_achievement || ''} 
                  onChange={(e) => setEditingReport({...editingReport, overall_achievement: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="other_requirements">Other Requirements</Label>
                <Textarea 
                  id="other_requirements"
                  value={editingReport.other_requirements || ''} 
                  onChange={(e) => setEditingReport({...editingReport, other_requirements: e.target.value})}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
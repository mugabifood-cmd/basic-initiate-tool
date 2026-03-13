import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Users, Settings, Eye, Palette, Stamp, Printer, Download, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ClassTermSettingsDialog } from '@/components/admin/ClassTermSettingsDialog';
import ReportCardPreview from '@/components/ReportCardPreview';
import StampConfigurator, { type StampConfig } from '@/components/admin/StampConfigurator';

const REPORT_COLORS = [
  { id: 'white', name: 'White (Default)', value: '#ffffff' },
  { id: 'light-blue', name: 'Light Blue', value: '#e3f2fd' },
  { id: 'light-green', name: 'Light Green', value: '#e8f5e9' },
  { id: 'light-yellow', name: 'Light Yellow', value: '#fffde7' },
  { id: 'light-pink', name: 'Light Pink', value: '#fce4ec' },
  { id: 'light-purple', name: 'Light Purple', value: '#f3e5f5' },
  { id: 'light-orange', name: 'Light Orange', value: '#fff3e0' },
  { id: 'light-cyan', name: 'Light Cyan', value: '#e0f7fa' },
  { id: 'light-gray', name: 'Light Gray', value: '#f5f5f5' },
  { id: 'cream', name: 'Cream', value: '#fffef0' },
];

interface School {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  stream: string;
  academic_year: string;
  term: string;
  schools: {
    id: string;
    name: string;
  } | null;
}

interface Student {
  id: string;
  full_name: string;
  student_number: string;
}

export default function GenerateReports() {
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [templateId, setTemplateId] = useState('1');
  const [selectedColor, setSelectedColor] = useState('white');
  const [generationType, setGenerationType] = useState<'individual' | 'class' | 'stream'>('individual');
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [showTermSettings, setShowTermSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);

  // Stamp state
  const [stampApplied, setStampApplied] = useState(false);
  const [schoolStampUrl, setSchoolStampUrl] = useState<string | null>(null);
  const [stampConfig, setStampConfig] = useState<StampConfig>({ x: 85, y: 75, size: 120, opacity: 0.4 });
  const [isDragging, setIsDragging] = useState(false);
  const [previewSchoolId, setPreviewSchoolId] = useState<string>('');
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; startConfigX: number; startConfigY: number } | null>(null);
  
  // Print/Download state
  const [previewReady, setPreviewReady] = useState(false);
  const [printPending, setPrintPending] = useState(false);
  const [downloadPending, setDownloadPending] = useState(false);

  useEffect(() => {
    fetchSchools();
    fetchRecentReports();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchClasses();
    }
  }, [selectedSchool]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (showPreview && previewReportId) {
      loadStampConfig(previewReportId);
    }
  }, [showPreview, previewReportId, selectedSchool]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching schools", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!selectedSchool) return;
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`id, name, stream, academic_year, term, schools (id, name)`)
        .eq('school_id', selectedSchool)
        .order('name');
      if (error) throw error;
      setClasses((data as any) || []);
    } catch (error: any) {
      toast({ title: "Error fetching classes", description: error.message, variant: "destructive" });
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    try {
      const { data, error } = await supabase
        .from('class_students')
        .select(`students (id, full_name, student_number)`)
        .eq('class_id', selectedClass);
      if (error) throw error;
      const studentData = data?.map(item => item.students).filter(Boolean) || [];
      setStudents(studentData);
    } catch (error: any) {
      toast({ title: "Error fetching students", description: error.message, variant: "destructive" });
    }
  };

  const fetchRecentReports = async () => {
    try {
      const { data, error } = await supabase
        .from('report_cards')
        .select(`*, students (full_name, student_number), classes (name, stream, academic_year, term)`)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      setRecentReports(data || []);
    } catch (error: any) {
      console.error('Error fetching recent reports:', error);
    }
  };

  const loadStampConfig = async (reportId?: string) => {
    try {
      let schoolId = '';

      if (reportId) {
        const { data: reportWithClass } = await supabase
          .from('report_cards')
          .select('classes ( school_id )')
          .eq('id', reportId)
          .single();

        schoolId = (reportWithClass as any)?.classes?.school_id || '';
      }

      if (!schoolId) {
        schoolId = selectedSchool;
      }

      if (!schoolId) {
        setPreviewSchoolId('');
        setSchoolStampUrl(null);
        setStampApplied(false);
        return;
      }

      setPreviewSchoolId(schoolId);

      const { data, error } = await supabase
        .from('schools')
        .select('stamp_url, stamp_position_x, stamp_position_y, stamp_size, stamp_opacity')
        .eq('id', schoolId)
        .single();

      if (error) throw error;

      const school = data as any;
      const hasStamp = Boolean(school.stamp_url);
      setSchoolStampUrl(school.stamp_url || null);
      setStampApplied(hasStamp);

      if (hasStamp) {
        setStampConfig({
          x: school.stamp_position_x ?? 85,
          y: school.stamp_position_y ?? 75,
          size: school.stamp_size ?? 120,
          opacity: school.stamp_opacity ?? 0.4,
        });
      }
    } catch {
      setPreviewSchoolId('');
      setSchoolStampUrl(null);
      setStampApplied(false);
    }
  };

  const handleApplyStamp = () => {
    if (schoolStampUrl) {
      setStampApplied(true);
    }
  };

  const handlePreviewReady = useCallback(() => {
    setPreviewReady(true);
  }, []);

  const handlePrint = () => {
    setPrintPending(true);
    setPreviewReady(false);
  };

  const processDownload = async () => {
    try {
      const element = document.getElementById('report-card-preview');
      if (!element || !element.offsetHeight || !element.offsetWidth) {
        throw new Error("Report card not fully loaded. Please try again.");
      }
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        imageTimeout: 0
      });
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error("Failed to capture report card.");
      }
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save('Report_Card.pdf');
      toast({ title: "Download complete", description: "Report card PDF downloaded successfully." });
    } catch (error: any) {
      toast({ title: "Download failed", description: error.message, variant: "destructive" });
    } finally {
      setDownloadPending(false);
    }
  };

  const handleDownloadPDF = () => {
    setDownloadPending(true);
    setPreviewReady(false);
  };

  useEffect(() => {
    if (!previewReady) return;
    if (downloadPending) {
      processDownload();
    }
    if (printPending) {
      setTimeout(() => {
        window.print();
        setPrintPending(false);
      }, 500);
    }
  }, [previewReady, downloadPending, printPending]);

  // Drag handlers for stamp on preview
  const handleStampMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startConfigX: stampConfig.x,
      startConfigY: stampConfig.y,
    };
  }, [stampConfig.x, stampConfig.y]);

  const handleStampTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startConfigX: stampConfig.x,
      startConfigY: stampConfig.y,
    };
  }, [stampConfig.x, stampConfig.y]);

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;
      setStampConfig(prev => ({
        ...prev,
        x: Math.max(0, Math.min(100, Math.round((dragStartRef.current!.startConfigX + dx) * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round((dragStartRef.current!.startConfigY + dy) * 10) / 10)),
      }));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragStartRef.current || !previewContainerRef.current) return;
      const touch = e.touches[0];
      const rect = previewContainerRef.current.getBoundingClientRect();
      const dx = ((touch.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const dy = ((touch.clientY - dragStartRef.current.startY) / rect.height) * 100;
      setStampConfig(prev => ({
        ...prev,
        x: Math.max(0, Math.min(100, Math.round((dragStartRef.current!.startConfigX + dx) * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round((dragStartRef.current!.startConfigY + dy) * 10) / 10)),
      }));
    };
    const onEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  const handleGenerate = async () => {
    if (!selectedClass) {
      toast({ title: "Selection Required", description: "Please select a class to generate reports.", variant: "destructive" });
      return;
    }
    if (generationType === 'individual' && !selectedStudent) {
      toast({ title: "Selection Required", description: "Please select a student for individual report generation.", variant: "destructive" });
      return;
    }
    try {
      setGenerating(true);
      let targetStudents = generationType === 'individual' && selectedStudent
        ? students.filter(s => s.id === selectedStudent)
        : students;

      if (targetStudents.length === 0) {
        toast({ title: "No Students Found", description: "No students found for report generation.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-report-cards', {
        body: {
          class_id: selectedClass,
          student_ids: targetStudents.map(s => s.id),
          template_id: parseInt(templateId),
          generation_type: generationType
        }
      });
      if (error) throw error;

      toast({ title: "Report Generation Started", description: `Started generating ${targetStudents.length} report card${targetStudents.length > 1 ? 's' : ''}.` });
      setSelectedStudent('');
      fetchRecentReports();
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast({ title: "Generation Failed", description: error.message || "Failed to send a request to the Edge Function. Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const getSelectedClass = () => classes.find(c => c.id === selectedClass);

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
              <h1 className="text-xl font-semibold text-gray-900">Generate Report Cards</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generation Form */}
          <Card>
            <CardHeader>
              <CardTitle>Report Card Generation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="school">School</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="class">Class</Label>
                  {selectedClass && (
                    <Button variant="default" size="sm" onClick={() => setShowTermSettings(true)}
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white animate-pulse">
                      <Settings className="w-3 h-3 mr-1" />Term Settings
                    </Button>
                  )}
                </div>
                <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedSchool}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name} {classItem.stream} - {classItem.term} {classItem.academic_year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="generation-type">Generation Type</Label>
                <Select value={generationType} onValueChange={(value: any) => setGenerationType(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Student</SelectItem>
                    <SelectItem value="class">Entire Class</SelectItem>
                    <SelectItem value="stream">Entire Stream</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {generationType === 'individual' && (
                <div>
                  <Label htmlFor="student">Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} ({student.student_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="template">Report Card Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Template 1 - Standard</SelectItem>
                    <SelectItem value="2">Template 2 - Modern</SelectItem>
                    <SelectItem value="3">Template 3 - Classic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />Report Card Color
                </Label>
                <Select value={selectedColor} onValueChange={setSelectedColor}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_COLORS.map((color) => (
                      <SelectItem key={color.id} value={color.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: color.value }} />
                          {color.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {recentReports.length > 0 && (
                <Button variant="outline" onClick={() => {
                  setPreviewReportId(recentReports[0].id);
                  setShowPreview(true);
                }} className="w-full">
                  <Eye className="w-4 h-4 mr-2" />Preview Report Card Template
                </Button>
              )}

              <Button onClick={handleGenerate} disabled={generating || !selectedClass} className="w-full">
                {generating ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Generating...</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" />Generate Report Cards</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Generation Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedClass && (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Selected Class</h4>
                    <p className="text-blue-800">{getSelectedClass()?.name} {getSelectedClass()?.stream}</p>
                    <p className="text-sm text-blue-600">{getSelectedClass()?.academic_year} - Term {getSelectedClass()?.term}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Generation Type:</span>
                      <Badge variant="outline">
                        {generationType === 'individual' ? 'Individual Student' : generationType === 'class' ? 'Entire Class' : 'Entire Stream'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Template:</span>
                      <Badge variant="outline">Template {templateId}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Students to Generate:</span>
                      <Badge><Users className="w-3 h-3 mr-1" />{generationType === 'individual' && selectedStudent ? 1 : students.length}</Badge>
                    </div>
                  </div>

                  {generationType === 'individual' && selectedStudent && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Selected Student</h4>
                      <p className="text-green-800">{students.find(s => s.id === selectedStudent)?.full_name}</p>
                      <p className="text-sm text-green-600">{students.find(s => s.id === selectedStudent)?.student_number}</p>
                    </div>
                  )}

                  {generationType !== 'individual' && students.length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Bulk Generation</h4>
                      <p className="text-purple-800">{students.length} report cards will be generated</p>
                      <p className="text-sm text-purple-600">A ZIP file will be created for download</p>
                    </div>
                  )}
                </>
              )}

              {!selectedClass && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a class to see generation preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Generations */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Generations</span>
              {recentReports.length > 0 && (
                <Link to="/admin/reports"><Button variant="outline" size="sm">View All</Button></Link>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent report card generations found.</p>
                <p className="text-sm">Generated report cards will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{report.students.full_name}</p>
                      <p className="text-sm text-gray-600">{report.classes.name} {report.classes.stream} - {report.classes.term} {report.classes.academic_year}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{report.overall_average?.toFixed(1) || 'N/A'}%</p>
                        <Badge variant="outline" className="text-xs">{report.overall_grade || 'N/A'}</Badge>
                      </div>
                      <Badge className={report.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}>{report.status}</Badge>
                      <Button variant="outline" size="sm" onClick={() => {
                        setPreviewReportId(report.id);
                        setShowPreview(true);
                      }}><Eye className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <ClassTermSettingsDialog
        open={showTermSettings}
        onOpenChange={setShowTermSettings}
        classId={selectedClass}
        className={getSelectedClass() ? `${getSelectedClass()?.name} ${getSelectedClass()?.stream}` : ''}
      />

      {/* Report Card Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={(open) => {
        setShowPreview(open);
        if (!open) {
          setStampApplied(false);
          setPreviewReady(false);
          setPrintPending(false);
          setDownloadPending(false);
          setPreviewSchoolId('');
        } else {
          loadStampConfig(previewReportId ?? undefined);
        }
      }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto print:max-w-full">
          <DialogHeader>
            <DialogTitle>Report Card Preview</DialogTitle>
          </DialogHeader>
          {previewReportId && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
              {/* Report preview with single draggable stamp layer */}
              <div ref={previewContainerRef} className="relative border rounded-lg overflow-hidden">
                <ReportCardPreview
                  reportId={previewReportId}
                  backgroundColor={REPORT_COLORS.find(c => c.id === selectedColor)?.value || '#ffffff'}
                  showStamp={stampApplied}
                  stampConfig={stampApplied ? stampConfig : null}
                  stampInteractive={stampApplied}
                  onStampMouseDown={handleStampMouseDown}
                  onStampTouchStart={handleStampTouchStart}
                  isStampDragging={isDragging}
                  onReady={handlePreviewReady}
                />
              </div>

              {/* Stamp controls sidebar */}
              <div className="space-y-3">
                {!schoolStampUrl && (
                  <Alert>
                    <Stamp className="h-4 w-4" />
                    <AlertDescription>
                      No stamp uploaded for this school. Please upload a stamp in the{' '}
                      <Link to="/admin/headteacher-signature" className="underline font-medium text-primary">
                        Headteacher Signature
                      </Link>{' '}page first.
                    </AlertDescription>
                  </Alert>
                )}

                {schoolStampUrl && !stampApplied && (
                  <Button onClick={handleApplyStamp} className="w-full gap-2">
                    <Stamp className="h-4 w-4" />
                    Apply Stamp
                  </Button>
                )}

                {stampApplied && (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600">Stamp Applied</Badge>
                      <Button variant="outline" size="sm" onClick={() => setStampApplied(false)}>
                        Remove
                      </Button>
                    </div>
                    <StampConfigurator
                      stampUrl={schoolStampUrl!}
                      config={stampConfig}
                      onChange={setStampConfig}
                      schoolId={previewSchoolId || selectedSchool}
                      previewRef={previewContainerRef}
                    />
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Footer with action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4 print:hidden">
            <Button variant="outline" onClick={() => setShowPreview(false)} className="gap-2">
              <X className="h-4 w-4" />
              Close
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={printPending} className="gap-2">
              <Printer className="h-4 w-4" />
              {printPending ? 'Preparing...' : 'Print'}
            </Button>
            <Button onClick={handleDownloadPDF} disabled={downloadPending} className="gap-2">
              <Download className="h-4 w-4" />
              {downloadPending ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

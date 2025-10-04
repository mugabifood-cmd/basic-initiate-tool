import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, FileText, Download, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  // Form state
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [templateId, setTemplateId] = useState('1');
  const [generationType, setGenerationType] = useState<'individual' | 'class' | 'stream'>('individual');

  useEffect(() => {
    fetchSchools();
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

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching schools",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    if (!selectedSchool) return;

    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          stream,
          academic_year,
          term,
          schools (
            id,
            name
          )
        `)
        .eq('school_id', selectedSchool)
        .order('name');

      if (error) throw error;
      setClasses((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching classes",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;

    try {
      const { data, error } = await supabase
        .from('class_students')
        .select(`
          students (
            id,
            full_name,
            student_number
          )
        `)
        .eq('class_id', selectedClass);

      if (error) throw error;
      
      const studentData = data?.map(item => item.students).filter(Boolean) || [];
      setStudents(studentData);
    } catch (error: any) {
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleGenerate = async () => {
    if (!selectedClass) {
      toast({
        title: "Selection Required",
        description: "Please select a class to generate reports.",
        variant: "destructive"
      });
      return;
    }

    if (generationType === 'individual' && !selectedStudent) {
      toast({
        title: "Selection Required",
        description: "Please select a student for individual report generation.",
        variant: "destructive"
      });
      return;
    }

    try {
      setGenerating(true);

      // Determine which students to generate reports for
      let targetStudents = [];
      if (generationType === 'individual' && selectedStudent) {
        targetStudents = students.filter(s => s.id === selectedStudent);
      } else {
        targetStudents = students;
      }

      if (targetStudents.length === 0) {
        toast({
          title: "No Students Found",
          description: "No students found for report generation.",
          variant: "destructive"
        });
        return;
      }

      // Call the report generation edge function
      const { data, error } = await supabase.functions.invoke('generate-report-cards', {
        body: {
          class_id: selectedClass,
          student_ids: targetStudents.map(s => s.id),
          template_id: parseInt(templateId),
          generation_type: generationType
        }
      });

      if (error) throw error;

      toast({
        title: "Report Generation Started",
        description: `Started generating ${targetStudents.length} report card${targetStudents.length > 1 ? 's' : ''}.`
      });

      // Reset form
      setSelectedStudent('');
      
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to send a request to the Edge Function. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const getSelectedClass = () => {
    return classes.find(c => c.id === selectedClass);
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
              {/* School Selection */}
              <div>
                <Label htmlFor="school">School</Label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class Selection */}
              <div>
                <Label htmlFor="class">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass} disabled={!selectedSchool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name} {classItem.stream} - {classItem.term} {classItem.academic_year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generation Type */}
              <div>
                <Label htmlFor="generation-type">Generation Type</Label>
                <Select value={generationType} onValueChange={(value: any) => setGenerationType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Student</SelectItem>
                    <SelectItem value="class">Entire Class</SelectItem>
                    <SelectItem value="stream">Entire Stream</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Student Selection (for individual) */}
              {generationType === 'individual' && (
                <div>
                  <Label htmlFor="student">Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
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

              {/* Template Selection */}
              <div>
                <Label htmlFor="template">Report Card Template</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Template 1 - Classic Blue</SelectItem>
                    <SelectItem value="2">Template 2 - Modern Green</SelectItem>
                    <SelectItem value="3">Template 3 - Professional Gray</SelectItem>
                    <SelectItem value="4">Template 4 - Academic Purple</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button 
                onClick={handleGenerate} 
                disabled={generating || !selectedClass}
                className="w-full"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report Cards
                  </>
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
                    <p className="text-blue-800">
                      {getSelectedClass()?.name} {getSelectedClass()?.stream}
                    </p>
                    <p className="text-sm text-blue-600">
                      {getSelectedClass()?.academic_year} - Term {getSelectedClass()?.term}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Generation Type:</span>
                      <Badge variant="outline">
                        {generationType === 'individual' ? 'Individual Student' : 
                         generationType === 'class' ? 'Entire Class' : 'Entire Stream'}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Template:</span>
                      <Badge variant="outline">
                        Template {templateId}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Students to Generate:</span>
                      <Badge>
                        <Users className="w-3 h-3 mr-1" />
                        {generationType === 'individual' && selectedStudent ? 1 : students.length}
                      </Badge>
                    </div>
                  </div>

                  {generationType === 'individual' && selectedStudent && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Selected Student</h4>
                      <p className="text-green-800">
                        {students.find(s => s.id === selectedStudent)?.full_name}
                      </p>
                      <p className="text-sm text-green-600">
                        {students.find(s => s.id === selectedStudent)?.student_number}
                      </p>
                    </div>
                  )}

                  {generationType !== 'individual' && students.length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Bulk Generation</h4>
                      <p className="text-purple-800">
                        {students.length} report cards will be generated
                      </p>
                      <p className="text-sm text-purple-600">
                        A ZIP file will be created for download
                      </p>
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
            <CardTitle>Recent Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <p>No recent report card generations found.</p>
              <p className="text-sm">Generated report cards will appear here.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
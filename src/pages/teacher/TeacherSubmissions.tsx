import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Class {
  id: string;
  name: string;
  stream: string;
  term: string;
  academic_year: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Student {
  id: string;
  full_name: string;
  student_number: string;
}

export default function TeacherSubmissions() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form data
  const [a1Score, setA1Score] = useState('');
  const [a2Score, setA2Score] = useState('');
  const [a3Score, setA3Score] = useState('');
  const [teacherComment, setTeacherComment] = useState('');

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching classes",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching subjects",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchStudents = async () => {
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
      
      const studentList = data?.map(item => (item as any).students).filter(Boolean) || [];
      setStudents(studentList);
    } catch (error: any) {
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const calculateGrades = () => {
    const a1 = parseFloat(a1Score) || 0;
    const a2 = parseFloat(a2Score) || 0;
    const a3 = parseFloat(a3Score) || 0;
    
    const percentage20 = a1;
    const percentage80 = a2 + a3;
    const percentage100 = percentage20 + percentage80;
    const averageScore = (a1 + a2 + a3) / 3;

    let grade = 'F';
    if (percentage100 >= 80) grade = 'D1';
    else if (percentage100 >= 75) grade = 'D2';
    else if (percentage100 >= 70) grade = 'C3';
    else if (percentage100 >= 65) grade = 'C4';
    else if (percentage100 >= 60) grade = 'C5';
    else if (percentage100 >= 55) grade = 'C6';
    else if (percentage100 >= 50) grade = 'P7';
    else if (percentage100 >= 45) grade = 'P8';
    else if (percentage100 >= 40) grade = 'F9';

    return { percentage20, percentage80, percentage100, averageScore, grade };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !selectedClass || !selectedSubject || !selectedStudent) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { percentage20, percentage80, percentage100, averageScore, grade } = calculateGrades();
      
      const { error } = await supabase
        .from('subject_submissions')
        .insert({
          teacher_id: profile.id,
          class_id: selectedClass,
          subject_id: selectedSubject,
          student_id: selectedStudent,
          a1_score: parseFloat(a1Score) || 0,
          a2_score: parseFloat(a2Score) || 0,
          a3_score: parseFloat(a3Score) || 0,
          percentage_20: percentage20,
          percentage_80: percentage80,
          percentage_100: percentage100,
          average_score: averageScore,
          grade,
          teacher_comment: teacherComment,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Submission Successful",
        description: "Marks have been submitted for review"
      });

      // Reset form
      setA1Score('');
      setA2Score('');
      setA3Score('');
      setTeacherComment('');
      setSelectedStudent('');
      
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <h1 className="text-xl font-semibold text-gray-900">Submit Marks</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Mark Submission Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.stream} - {cls.term} {cls.academic_year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedClass && (
                <div className="space-y-2">
                  <Label htmlFor="student">Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.student_number} - {student.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="a1">A1 Score (20%)</Label>
                  <Input
                    id="a1"
                    type="number"
                    min="0"
                    max="20"
                    value={a1Score}
                    onChange={(e) => setA1Score(e.target.value)}
                    placeholder="0-20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="a2">A2 Score (40%)</Label>
                  <Input
                    id="a2"
                    type="number"
                    min="0"
                    max="40"
                    value={a2Score}
                    onChange={(e) => setA2Score(e.target.value)}
                    placeholder="0-40"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="a3">A3 Score (40%)</Label>
                  <Input
                    id="a3"
                    type="number"
                    min="0"
                    max="40"
                    value={a3Score}
                    onChange={(e) => setA3Score(e.target.value)}
                    placeholder="0-40"
                    required
                  />
                </div>
              </div>

              {(a1Score || a2Score || a3Score) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Calculated Results:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Total (100%):</span>
                      <div className="font-medium">{calculateGrades().percentage100.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Average:</span>
                      <div className="font-medium">{calculateGrades().averageScore.toFixed(1)}</div>
                    </div>
                    <div>
                      <span className="text-blue-700">Grade:</span>
                      <div className="font-medium">{calculateGrades().grade}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="comment">Teacher Comment</Label>
                <Textarea
                  id="comment"
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value)}
                  placeholder="Enter your comment about the student's performance..."
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !selectedClass || !selectedSubject || !selectedStudent}
              >
                {isLoading ? 'Submitting...' : 'Submit Marks'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
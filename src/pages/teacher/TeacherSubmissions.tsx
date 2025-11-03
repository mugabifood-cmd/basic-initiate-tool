import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, ArrowUp, ArrowRight } from 'lucide-react';
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
  created_at?: string;
}

interface SubjectEntry {
  id: string;
  subjectId: string;
  subjectCode: string;
  a1Score: string;
  a2Score: string;
  a3Score: string;
  teacherInitials: string;
  identifier: string;
  percentage20: string;
  percentage80: string;
  percentage100: string;
}

type SortOrder = 'az' | 'za' | 'new-old' | 'old-new';

export default function TeacherSubmissions() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('az');
  const [subjectEntries, setSubjectEntries] = useState<SubjectEntry[]>([
    {
      id: '1',
      subjectId: '',
      subjectCode: '',
      a1Score: '',
      a2Score: '',
      a3Score: '',
      teacherInitials: '',
      identifier: '1',
      percentage20: '',
      percentage80: '',
      percentage100: ''
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const newSubjectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClasses();
    fetchSubjects();
    fetchStudents();
  }, []);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchQuery, sortOrder]);

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
        .from('students')
        .select('id, full_name, student_number, created_at')
        .order('full_name');
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filterAndSortStudents = () => {
    let filtered = [...students];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'az':
          return a.full_name.localeCompare(b.full_name);
        case 'za':
          return b.full_name.localeCompare(a.full_name);
        case 'new-old':
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        case 'old-new':
          return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
        default:
          return 0;
      }
    });

    setFilteredStudents(filtered);
  };

  const toggleSort = () => {
    const orders: SortOrder[] = ['az', 'za', 'new-old', 'old-new'];
    const currentIndex = orders.indexOf(sortOrder);
    const nextIndex = (currentIndex + 1) % orders.length;
    setSortOrder(orders[nextIndex]);
  };

  const getSortIcon = () => {
    switch (sortOrder) {
      case 'az':
        return '↑ → Z';
      case 'za':
        return '↓ → A';
      case 'new-old':
        return 'New → Old';
      case 'old-new':
        return 'Old → New';
    }
  };

  const calculateAVG = (a1: string, a2: string, a3: string) => {
    const a1Num = parseFloat(a1) || 0;
    const a2Num = parseFloat(a2) || 0;
    const a3Num = parseFloat(a3) || 0;
    return ((a1Num + a2Num + a3Num) / 3).toFixed(2);
  };

  const calculateGrade = (avg: number) => {
    if (avg >= 90) return 'A';
    if (avg >= 80) return 'B';
    if (avg >= 70) return 'C';
    if (avg >= 60) return 'D';
    if (avg >= 50) return 'E';
    return 'F';
  };

  const calculateAchievementLevel = (avg: number) => {
    if (avg >= 90) return 'Outstanding';
    if (avg >= 75) return 'Exceptional';
    if (avg >= 60) return 'Satisfactory';
    return 'Basic';
  };

  const getIdentifierText = (identifier: string) => {
    switch (identifier) {
      case '1':
        return '1 - Basic';
      case '2':
        return '2 - Moderate';
      case '3':
        return '3 - Outstanding';
      default:
        return '1 - Basic';
    }
  };

  const addNewSubject = () => {
    const newEntry: SubjectEntry = {
      id: Date.now().toString(),
      subjectId: '',
      subjectCode: '',
      a1Score: '',
      a2Score: '',
      a3Score: '',
      teacherInitials: '',
      identifier: '1',
      percentage20: '',
      percentage80: '',
      percentage100: ''
    };
    setSubjectEntries([...subjectEntries, newEntry]);
    
    // Scroll to new subject after a brief delay
    setTimeout(() => {
      newSubjectRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const updateSubjectEntry = (id: string, field: keyof SubjectEntry, value: string) => {
    setSubjectEntries(entries =>
      entries.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleSubjectChange = (id: string, subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    setSubjectEntries(entries =>
      entries.map(entry =>
        entry.id === id
          ? { ...entry, subjectId, subjectCode: subject?.code || '' }
          : entry
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !selectedClass || !selectedStudent || !selectedTerm) {
      toast({
        title: "Missing Information",
        description: "Please select a class, student, and term",
        variant: "destructive"
      });
      return;
    }

    // Validate all subject entries
    for (const entry of subjectEntries) {
      if (!entry.subjectId || !entry.a1Score || !entry.a2Score || !entry.a3Score || !entry.teacherInitials) {
        toast({
          title: "Incomplete Subject Entry",
          description: "Please fill in all fields for each subject",
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      const submissions = subjectEntries.map(entry => {
        const a1 = parseFloat(entry.a1Score) || 0;
        const a2 = parseFloat(entry.a2Score) || 0;
        const a3 = parseFloat(entry.a3Score) || 0;
        const avg = parseFloat(calculateAVG(entry.a1Score, entry.a2Score, entry.a3Score));
        
        return {
          teacher_id: profile.id,
          class_id: selectedClass,
          subject_id: entry.subjectId,
          student_id: selectedStudent,
          a1_score: a1,
          a2_score: a2,
          a3_score: a3,
          average_score: avg,
          percentage_20: a1,
          percentage_80: a2 + a3,
          percentage_100: a1 + a2 + a3,
          grade: calculateGrade(avg),
          remarks: calculateAchievementLevel(avg),
          teacher_comment: `Teacher Initials: ${entry.teacherInitials}, Identifier: ${getIdentifierText(entry.identifier)}`,
          status: 'pending'
        };
      });

      const { error } = await supabase
        .from('subject_submissions')
        .upsert(submissions, {
          onConflict: 'class_id,student_id,subject_id'
        });

      if (error) throw error;

      toast({
        title: "Submission Successful",
        description: `Marks for ${subjectEntries.length} subject(s) have been submitted for review`
      });

      // Reset form
      setSubjectEntries([{
        id: '1',
        subjectId: '',
        subjectCode: '',
        a1Score: '',
        a2Score: '',
        a3Score: '',
        teacherInitials: '',
        identifier: '1',
        percentage20: '',
        percentage80: '',
        percentage100: ''
      }]);
      setSelectedClass('');
      setSelectedStudent('');
      setSelectedTerm('');
      setSearchQuery('');
      
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
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Mark Submission Form</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Class and Term Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
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
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Student Selection Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-6 space-y-2">
              <Label>Student</Label>
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="lg:col-span-2 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSort}
                className="h-10 px-3 mt-auto"
              >
                {getSortIcon()}
              </Button>
            </div>

            <div className="lg:col-span-4 flex justify-end">
              <Button
                type="button"
                onClick={addNewSubject}
                className="w-full lg:w-auto mt-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Subject
              </Button>
            </div>
          </div>

          {/* Student Dropdown */}
          <div className="space-y-2">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {filteredStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.student_number} - {student.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject Marks Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Subject Marks</h2>

            {subjectEntries.map((entry, index) => (
              <div
                key={entry.id}
                ref={index === subjectEntries.length - 1 ? newSubjectRef : null}
                className="space-y-4 p-6 border rounded-lg bg-card"
              >
                <h3 className="text-lg font-medium text-foreground">
                  Subject {index + 1}
                </h3>

                {/* Subject and Subject Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Select
                      value={entry.subjectId}
                      onValueChange={(value) => handleSubjectChange(entry.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject Code</Label>
                    <Input
                      value={entry.subjectCode}
                      readOnly
                      placeholder="Auto-filled"
                      className="bg-muted"
                    />
                  </div>
                </div>

                {/* A1, A2, A3, AVG */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>A1 Score</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={entry.a1Score}
                      onChange={(e) => updateSubjectEntry(entry.id, 'a1Score', e.target.value)}
                      placeholder="0.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>A2 Score</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={entry.a2Score}
                      onChange={(e) => updateSubjectEntry(entry.id, 'a2Score', e.target.value)}
                      placeholder="0.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>A3 Score</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={entry.a3Score}
                      onChange={(e) => updateSubjectEntry(entry.id, 'a3Score', e.target.value)}
                      placeholder="0.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>AVG</Label>
                    <Input
                      value={calculateAVG(entry.a1Score, entry.a2Score, entry.a3Score)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>

                {/* 20%, 80%, 100%, Teacher Initials */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>20% Score</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={entry.percentage20}
                      onChange={(e) => updateSubjectEntry(entry.id, 'percentage20', e.target.value)}
                      placeholder="0-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>80% Score</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={entry.percentage80}
                      onChange={(e) => updateSubjectEntry(entry.id, 'percentage80', e.target.value)}
                      placeholder="0-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>100% Score</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={entry.percentage100}
                      onChange={(e) => updateSubjectEntry(entry.id, 'percentage100', e.target.value)}
                      placeholder="0-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Teacher Initials</Label>
                    <Input
                      value={entry.teacherInitials}
                      onChange={(e) => updateSubjectEntry(entry.id, 'teacherInitials', e.target.value)}
                      placeholder="e.g, B.S."
                    />
                  </div>
                </div>

                {/* Identifier, Grade, Achievement Level */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Identifier</Label>
                    <Select
                      value={entry.identifier}
                      onValueChange={(value) => updateSubjectEntry(entry.id, 'identifier', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Basic</SelectItem>
                        <SelectItem value="2">2 - Moderate</SelectItem>
                        <SelectItem value="3">3 - Outstanding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Grade (Auto-calculated)</Label>
                    <Input
                      value={calculateGrade(parseFloat(calculateAVG(entry.a1Score, entry.a2Score, entry.a3Score)))}
                      readOnly
                      className="bg-muted"
                      placeholder="Auto"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Achievement Level (Auto-calculated)</Label>
                    <Input
                      value={calculateAchievementLevel(parseFloat(calculateAVG(entry.a1Score, entry.a2Score, entry.a3Score)))}
                      readOnly
                      className="bg-muted"
                      placeholder="Auto"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={isLoading || !selectedClass || !selectedStudent || !selectedTerm}
              className="w-full md:w-auto"
            >
              {isLoading ? 'Submitting...' : 'Submit All Marks'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
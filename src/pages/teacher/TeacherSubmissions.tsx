import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, ArrowUp, ArrowRight, Trash2 } from 'lucide-react';
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

interface GradeBoundary {
  id: string;
  grade: string;
  min_score: number;
  max_score: number;
}

type SortOrder = 'az' | 'za' | 'new-old' | 'old-new';

interface TeacherAssignment {
  assignment_type: string;
  subject_id: string | null;
  class_name: string | null;
  stream: string | null;
}

export default function TeacherSubmissions() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [gradeBoundaries, setGradeBoundaries] = useState<GradeBoundary[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<Class[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
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
    if (profile) {
      fetchTeacherAssignments();
      // Pre-populate teacher initials if available
      if (profile.initials) {
        setSubjectEntries(entries => 
          entries.map(entry => ({
            ...entry,
            teacherInitials: entry.teacherInitials || profile.initials || ''
          }))
        );
      }
    }
  }, [profile]);

  useEffect(() => {
    if (teacherAssignments.length > 0) {
      fetchClasses();
      fetchGradeBoundaries();
    }
  }, [teacherAssignments]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsInClass();
      fetchSubjects();
    } else {
      setAssignedSubjects([]);
    }
  }, [selectedClass, teacherAssignments]);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchQuery, sortOrder]);

  useEffect(() => {
    filterAndSortStudents();
  }, [students, searchQuery, sortOrder]);

  const fetchTeacherAssignments = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select('*')
        .eq('teacher_id', profile.id);
      
      if (error) throw error;
      setTeacherAssignments(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching assignments",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchClasses = async () => {
    try {
      // Get unique class names and streams from teacher assignments
      const assignedClassStreams = teacherAssignments.map(a => ({
        class_name: a.class_name,
        stream: a.stream
      })).filter(a => a.class_name && a.stream);

      if (assignedClassStreams.length === 0) {
        setAssignedClasses([]);
        return;
      }

      // Fetch all classes
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name');
      
      if (error) throw error;

      // Filter to only assigned classes
      const filtered = (data || []).filter(cls => 
        assignedClassStreams.some(assigned => 
          assigned.class_name === cls.name && assigned.stream === cls.stream
        )
      );

      setAssignedClasses(filtered);
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
      if (!selectedClass) {
        setAssignedSubjects([]);
        return;
      }

      // Get the selected class details
      const selectedClassObj = assignedClasses.find(c => c.id === selectedClass);
      if (!selectedClassObj) return;

      // Get subject IDs assigned to this teacher for this class
      const assignedSubjectIds = teacherAssignments
        .filter(a => 
          a.assignment_type === 'subject_teacher' &&
          a.class_name === selectedClassObj.name &&
          a.stream === selectedClassObj.stream &&
          a.subject_id
        )
        .map(a => a.subject_id);

      if (assignedSubjectIds.length === 0) {
        setAssignedSubjects([]);
        toast({
          title: "No Subjects Assigned",
          description: "You have no subjects assigned to this class.",
          variant: "destructive"
        });
        return;
      }

      // Fetch subjects
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .in('id', assignedSubjectIds)
        .order('name');
      
      if (error) throw error;
      setAssignedSubjects(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching subjects",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const fetchStudentsInClass = async () => {
    if (!selectedClass) return;
    
    try {
      const { data, error } = await supabase
        .from('class_students')
        .select('student_id, students(id, full_name, student_number, created_at)')
        .eq('class_id', selectedClass);
      
      if (error) throw error;
      
      const studentData = (data || [])
        .map(cs => cs.students)
        .filter(s => s !== null) as Student[];
      
      setStudents(studentData);
    } catch (error: any) {
      toast({
        title: "Error fetching students",
        description: error.message,
        variant: "destructive"
      });
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
      toast({
        title: "Error fetching grade boundaries",
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
    // Use grade boundaries from database
    for (const boundary of gradeBoundaries) {
      if (avg >= boundary.min_score && avg <= boundary.max_score) {
        return boundary.grade;
      }
    }
    // Fallback to 'F' if no boundary matches
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
      teacherInitials: profile?.initials || '',
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

  const deleteSubjectEntry = (id: string) => {
    // Don't allow deleting if there's only one entry
    if (subjectEntries.length === 1) {
      toast({
        title: "Cannot Delete",
        description: "At least one subject entry is required",
        variant: "destructive"
      });
      return;
    }
    
    setSubjectEntries(entries => entries.filter(entry => entry.id !== id));
    toast({
      title: "Subject Removed",
      description: "Subject entry has been deleted"
    });
  };

  const updateSubjectEntry = (id: string, field: keyof SubjectEntry, value: string) => {
    // Validate A scores (must allow decimals)
    if ((field === 'a1Score' || field === 'a2Score' || field === 'a3Score') && value !== '') {
      const hasDecimal = value.includes('.');
      if (!hasDecimal && parseFloat(value) === parseInt(value) && value !== '0') {
        toast({
          title: "Invalid Input",
          description: "A scores must be decimal values (e.g., 85.5). Please include a decimal point.",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Validate percentage scores (must be integers only)
    if ((field === 'percentage20' || field === 'percentage80' || field === 'percentage100') && value !== '') {
      if (value.includes('.')) {
        toast({
          title: "Invalid Input",
          description: "% scores must be whole numbers only (no decimals allowed).",
          variant: "destructive"
        });
        return;
      }
    }
    
    setSubjectEntries(entries =>
      entries.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const handleSubjectChange = (id: string, subjectId: string) => {
    const subject = assignedSubjects.find(s => s.id === subjectId);
    setSubjectEntries(entries =>
      entries.map(entry =>
        entry.id === id
          ? { ...entry, subjectId, subjectCode: subject?.code || '' }
          : entry
      )
    );
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedStudent('');
    setStudents([]);
    setAssignedSubjects([]);
    // Reset subject entries when class changes
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
      if (!entry.subjectId || !entry.a1Score || !entry.a2Score || !entry.a3Score || 
          !entry.percentage20 || !entry.percentage80 || !entry.percentage100 || !entry.teacherInitials) {
        toast({
          title: "Incomplete Subject Entry",
          description: "Please fill in all fields for each subject including A scores and % scores",
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      // Update teacher's profile initials if not already set
      const firstEntryWithInitials = subjectEntries.find(e => e.teacherInitials);
      if (firstEntryWithInitials && profile) {
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('initials')
          .eq('id', profile.id)
          .single();
        
        if (currentProfile && !currentProfile.initials) {
          await supabase
            .from('profiles')
            .update({ initials: firstEntryWithInitials.teacherInitials })
            .eq('id', profile.id);
        }
      }

      // Check if any submissions already exist for this student
      const { data: existingSubmissions, error: checkError } = await supabase
        .from('subject_submissions')
        .select('subject_id, status')
        .eq('class_id', selectedClass)
        .eq('student_id', selectedStudent)
        .in('subject_id', subjectEntries.map(e => e.subjectId));

      if (checkError) throw checkError;

      // Check if any existing submissions are not pending
      const approvedOrRejected = existingSubmissions?.filter(s => s.status !== 'pending') || [];
      if (approvedOrRejected.length > 0) {
        toast({
          title: "Cannot Submit",
          description: "Some subjects have already been approved or rejected. You can only update pending submissions.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const submissions = subjectEntries.map(entry => {
        const a1 = parseFloat(entry.a1Score) || 0;
        const a2 = parseFloat(entry.a2Score) || 0;
        const a3 = parseFloat(entry.a3Score) || 0;
        const avg = parseFloat(calculateAVG(entry.a1Score, entry.a2Score, entry.a3Score));
        
        // Use the manually entered percentage values (as integers)
        const percentage20 = parseInt(entry.percentage20) || 0;
        const percentage80 = parseInt(entry.percentage80) || 0;
        const percentage100 = parseInt(entry.percentage100) || 0;
        
        return {
          teacher_id: profile.id,
          class_id: selectedClass,
          subject_id: entry.subjectId,
          student_id: selectedStudent,
          a1_score: a1,
          a2_score: a2,
          a3_score: a3,
          average_score: avg,
          percentage_20: percentage20,
          percentage_80: percentage80,
          percentage_100: percentage100,
          grade: calculateGrade(percentage100), // Use percentage_100 for grade
          remarks: calculateAchievementLevel(percentage100), // Use percentage_100 for remarks
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
              <Label>Class (Only Your Assigned Classes)</Label>
              <Select value={selectedClass} onValueChange={handleClassChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {assignedClasses.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No classes assigned to you
                    </SelectItem>
                  ) : (
                    assignedClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.stream} - {cls.term} {cls.academic_year}
                      </SelectItem>
                    ))
                  )}
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
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-foreground">
                    Subject {index + 1}
                  </h3>
                  {subjectEntries.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteSubjectEntry(entry.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>

                {/* Subject and Subject Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject (Only Your Assigned Subjects for This Class)</Label>
                    <Select
                      value={entry.subjectId}
                      onValueChange={(value) => handleSubjectChange(entry.id, value)}
                      disabled={!selectedClass}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!selectedClass ? "Select class first" : "Select subject"} />
                      </SelectTrigger>
                      <SelectContent>
                        {!selectedClass ? (
                          <SelectItem value="none" disabled>
                            Please select a class first
                          </SelectItem>
                        ) : assignedSubjects.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No subjects assigned for this class
                          </SelectItem>
                        ) : (
                          assignedSubjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))
                        )}
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
                      value={entry.percentage100 ? calculateGrade(parseFloat(entry.percentage100)) : ''}
                      readOnly
                      className="bg-muted"
                      placeholder="Auto"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Achievement Level (Auto-calculated)</Label>
                    <Input
                      value={entry.percentage100 ? calculateAchievementLevel(parseFloat(entry.percentage100)) : ''}
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
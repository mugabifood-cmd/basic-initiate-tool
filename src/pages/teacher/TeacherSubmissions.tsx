import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ClassRow { id: string; name: string; stream: string; school_id: string; }
interface SubjectRow { id: string; name: string; code: string; }
interface StudentRow { id: string; full_name: string; student_number: string; }

interface MarkRow {
  a1: string;
  a2: string;
  a3: string;
  ave: string; // auto
  p20: string; // auto
  p80: string;
  p100: string; // auto
  identifier: string; // auto
  assigned: boolean;
}

// Identifier based on AVE (out of 3)
const computeIdentifier = (ave: number) => {
  if (ave >= 2.5) return 'A - Exceptional';
  if (ave >= 2.0) return 'B - Outstanding';
  if (ave >= 1.5) return 'C - Satisfactory';
  if (ave >= 1.0) return 'D - Basic';
  return 'E - Elementary';
};

const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

const recalc = (row: MarkRow): MarkRow => {
  const a1 = num(row.a1);
  const a2 = num(row.a2);
  const a3 = num(row.a3);
  const sum = a1 + a2 + a3;
  const ave = sum / 3;
  const p20 = (sum / 9) * 20;
  const p80 = num(row.p80);
  const p100 = round1(p20) + p80;
  const hasA = row.a1 || row.a2 || row.a3;
  return {
    ...row,
    ave: hasA ? round2(ave).toFixed(2) : '',
    p20: hasA ? round1(p20).toFixed(1) : '',
    p100: hasA || row.p80 ? String(round1(p100)) : '',
    identifier: hasA ? computeIdentifier(ave) : '',
  };
};

export default function TeacherSubmissions() {
  const { profile } = useAuth();
  const [assignedClasses, setAssignedClasses] = useState<ClassRow[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<SubjectRow[]>([]);
  const [allTeacherAssignments, setAllTeacherAssignments] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<Record<string, Set<string>>>({});
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [activeTerm, setActiveTerm] = useState('');
  const [activeYear, setActiveYear] = useState('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [marks, setMarks] = useState<Record<string, MarkRow>>({});
  const [submitting, setSubmitting] = useState(false);

  // Load teacher's assignments + active term
  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: assignments } = await supabase
        .from('teacher_assignments')
        .select('*')
        .eq('teacher_id', profile.id);
      setAllTeacherAssignments(assignments || []);

      const { data: ps } = await supabase
        .from('profile_schools')
        .select('school_id, schools:school_id(active_term, active_academic_year)')
        .eq('profile_id', profile.id)
        .limit(1)
        .maybeSingle();
      const sch: any = (ps as any)?.schools;
      if (ps?.school_id) setSchoolId(ps.school_id);
      if (sch) {
        setActiveTerm(sch.active_term || 'Term 1');
        setActiveYear(sch.active_academic_year || String(new Date().getFullYear()));
      }

      // load classes assigned
      const classKeys = (assignments || [])
        .filter((a: any) => a.class_name && a.stream)
        .map((a: any) => `${a.class_name}__${a.stream}`);
      const uniqueKeys = [...new Set(classKeys)];
      if (uniqueKeys.length === 0) return;

      const { data: cls } = await supabase.from('classes').select('id, name, stream, school_id');
      const filtered = (cls || []).filter((c: any) =>
        uniqueKeys.includes(`${c.name}__${c.stream}`)
      );
      setAssignedClasses(filtered);
    })();
  }, [profile]);

  // When class changes, derive subjects assigned to teacher for that class
  useEffect(() => {
    if (!selectedClass) {
      setAssignedSubjects([]);
      setSelectedSubject('');
      setStudents([]);
      setMarks({});
      return;
    }
    const cls = assignedClasses.find((c) => c.id === selectedClass);
    if (!cls) return;

    const subjectIds = [
      ...new Set(
        allTeacherAssignments
          .filter(
            (a: any) =>
              a.assignment_type === 'subject_teacher' &&
              a.subject_id &&
              a.class_name === cls.name &&
              a.stream === cls.stream
          )
          .map((a: any) => a.subject_id)
      ),
    ];
    if (subjectIds.length === 0) {
      setAssignedSubjects([]);
      setSelectedSubject('');
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('subjects')
        .select('id, name, code')
        .in('id', subjectIds as string[])
        .order('name');
      setAssignedSubjects((data as SubjectRow[]) || []);
    })();
  }, [selectedClass, assignedClasses, allTeacherAssignments]);

  // Load students for class + their subject assignments
  useEffect(() => {
    if (!selectedClass) return;
    (async () => {
      const { data: cs } = await supabase
        .from('class_students')
        .select('student_id, students(id, full_name, student_number)')
        .eq('class_id', selectedClass);
      const list = ((cs as any[]) || [])
        .map((r) => r.students)
        .filter(Boolean) as StudentRow[];
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
      setStudents(list);

      if (list.length > 0) {
        const ids = list.map((s) => s.id);
        const { data: ss } = await supabase
          .from('student_subjects')
          .select('student_id, subject_id')
          .in('student_id', ids);
        const map: Record<string, Set<string>> = {};
        (ss || []).forEach((row: any) => {
          if (!map[row.student_id]) map[row.student_id] = new Set();
          map[row.student_id].add(row.subject_id);
        });
        setStudentSubjects(map);
      } else {
        setStudentSubjects({});
      }
    })();
  }, [selectedClass]);

  // When subject or students change, init/refresh mark rows + load existing submissions
  useEffect(() => {
    if (!selectedSubject || students.length === 0) {
      setMarks({});
      return;
    }
    (async () => {
      const studentIds = students.map((s) => s.id);
      const { data: existing } = await supabase
        .from('subject_submissions')
        .select('student_id, a1_score, a2_score, a3_score, percentage_20, percentage_80, percentage_100, remarks, status')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .in('student_id', studentIds);

      const next: Record<string, MarkRow> = {};
      students.forEach((st) => {
        const assigned = studentSubjects[st.id]?.has(selectedSubject) ?? false;
        const found = (existing || []).find((e: any) => e.student_id === st.id);
        const base: MarkRow = {
          a1: found?.a1_score?.toString() ?? '',
          a2: found?.a2_score?.toString() ?? '',
          a3: found?.a3_score?.toString() ?? '',
          ave: '',
          p20: found?.percentage_20?.toString() ?? '',
          p80: found?.percentage_80?.toString() ?? '',
          p100: found?.percentage_100?.toString() ?? '',
          identifier: found?.remarks ?? '',
          assigned,
        };
        next[st.id] = recalc(base);
      });
      setMarks(next);
    })();
  }, [selectedSubject, students, studentSubjects, selectedClass]);

  const updateCell = (studentId: string, field: keyof MarkRow, value: string) => {
    setMarks((prev) => {
      const row = prev[studentId];
      if (!row || !row.assigned) return prev;
      const updated: MarkRow = { ...row, [field]: value } as MarkRow;
      return { ...prev, [studentId]: recalc(updated) };
    });
  };

  const selectedClassObj = useMemo(
    () => assignedClasses.find((c) => c.id === selectedClass),
    [assignedClasses, selectedClass]
  );

  const handleSubmit = async () => {
    if (!profile || !selectedClass || !selectedSubject || !activeTerm) {
      toast({ title: 'Select class & subject first', variant: 'destructive' });
      return;
    }
    const cls = selectedClassObj;
    if (!cls) return;

    const rows = Object.entries(marks)
      .filter(([sid, m]) => m.assigned && (m.a1 || m.a2 || m.a3 || m.p20 || m.p80))
      .map(([sid, m]) => {
        const p20 = num(m.p20);
        const p80 = num(m.p80);
        const p100 = p20 + p80;
        return {
          teacher_id: profile.id,
          school_id: cls.school_id,
          class_id: selectedClass,
          subject_id: selectedSubject,
          student_id: sid,
          a1_score: num(m.a1),
          a2_score: num(m.a2),
          a3_score: num(m.a3),
          average_score: (num(m.a1) + num(m.a2) + num(m.a3)) / 3,
          percentage_20: p20,
          percentage_80: p80,
          percentage_100: p100,
          remarks: computeIdentifier(p100),
          status: 'pending',
        };
      });

    if (rows.length === 0) {
      toast({ title: 'No marks to submit', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('subject_submissions')
        .upsert(rows, { onConflict: 'class_id,student_id,subject_id' });
      if (error) throw error;
      toast({ title: 'Marks submitted', description: `${rows.length} student row(s) saved` });
    } catch (e: any) {
      toast({ title: 'Submission failed', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>
            </Link>
          </div>

          <h1 className="text-3xl font-bold mb-6">Mark Submission</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Class & Stream</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {assignedClasses.length === 0 ? (
                    <SelectItem value="none" disabled>No classes assigned</SelectItem>
                  ) : assignedClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} {c.stream}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder={!selectedClass ? 'Select class first' : 'Select subject'} /></SelectTrigger>
                <SelectContent>
                  {assignedSubjects.length === 0 ? (
                    <SelectItem value="none" disabled>No subjects assigned</SelectItem>
                  ) : assignedSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Active Term</Label>
              <Input readOnly className="bg-muted" value={activeTerm && activeYear ? `${activeTerm} — ${activeYear}` : 'Loading…'} />
            </div>
          </div>

          {selectedSubject && students.length > 0 && (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Student Name</TableHead>
                    <TableHead className="w-20 text-center">A1</TableHead>
                    <TableHead className="w-20 text-center">A2</TableHead>
                    <TableHead className="w-20 text-center">A3</TableHead>
                    <TableHead className="w-24 text-center">20%</TableHead>
                    <TableHead className="w-24 text-center">80%</TableHead>
                    <TableHead className="w-24 text-center">100%</TableHead>
                    <TableHead className="w-32 text-center">Identifier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((st) => {
                    const m = marks[st.id];
                    if (!m) return null;
                    const disabled = !m.assigned;
                    const rowClass = disabled ? 'bg-muted/50 opacity-60' : '';
                    const rowContent = (
                      <TableRow key={st.id} className={rowClass}>
                        <TableCell className="font-medium">
                          {st.full_name}
                          <div className="text-xs text-muted-foreground">#{st.student_number}</div>
                        </TableCell>
                        {(['a1','a2','a3','p20','p80'] as const).map((f) => (
                          <TableCell key={f} className="p-1">
                            <Input
                              disabled={disabled}
                              value={(m as any)[f]}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || /^\d*\.?\d*$/.test(v)) updateCell(st.id, f, v);
                              }}
                              className="h-9 text-center"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="p-1">
                          <Input readOnly value={m.p100} className="h-9 text-center bg-muted" />
                        </TableCell>
                        <TableCell className="p-1 text-center text-sm">
                          {disabled ? <span className="text-muted-foreground">Disabled</span> : (m.identifier || '—')}
                        </TableCell>
                      </TableRow>
                    );
                    return disabled ? (
                      <Tooltip key={st.id}>
                        <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
                        <TooltipContent>Subject not assigned to this student</TooltipContent>
                      </Tooltip>
                    ) : rowContent;
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {selectedSubject && students.length === 0 && (
            <p className="text-muted-foreground">No students in this class.</p>
          )}

          {selectedSubject && students.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Marks'}
              </Button>
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { UserPlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/hooks/useSchool';
import { toast } from '@/hooks/use-toast';

interface SubjectOption { id: string; name: string; code: string }
interface ClassOption { name: string; streams: string[] }

interface SubjectAssignment {
  subjectId: string;
  className: string;
  stream: string;
}

export function AddTeacherDialog() {
  const { activeSchool } = useSchool();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [initials, setInitials] = useState('');

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [classTeacherClass, setClassTeacherClass] = useState<string>('');
  const [classTeacherStream, setClassTeacherStream] = useState<string>('');

  const reset = () => {
    setFullName(''); setEmail(''); setPassword(''); setConfirmPassword('');
    setInitials(''); setSubjectAssignments([]);
    setClassTeacherClass(''); setClassTeacherStream('');
  };

  // Load subjects + classes for the active school
  useEffect(() => {
    if (!open || !activeSchool) return;
    (async () => {
      const [{ data: subs }, { data: cls }] = await Promise.all([
        supabase.from('subjects').select('id, name, code').eq('school_id', activeSchool.id).order('name'),
        supabase.from('classes').select('name, stream').eq('school_id', activeSchool.id),
      ]);
      setSubjects(subs ?? []);
      const grouped = new Map<string, Set<string>>();
      (cls ?? []).forEach((c: any) => {
        if (!grouped.has(c.name)) grouped.set(c.name, new Set());
        grouped.get(c.name)!.add(c.stream);
      });
      setClasses(
        Array.from(grouped.entries())
          .map(([name, streams]) => ({ name, streams: Array.from(streams).sort() }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    })();
  }, [open, activeSchool]);

  const addSubjectRow = () =>
    setSubjectAssignments([...subjectAssignments, { subjectId: '', className: '', stream: '' }]);

  const updateSubjectRow = (idx: number, patch: Partial<SubjectAssignment>) => {
    setSubjectAssignments(subjectAssignments.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  const removeSubjectRow = (idx: number) =>
    setSubjectAssignments(subjectAssignments.filter((_, i) => i !== idx));

  const streamsFor = (className: string) =>
    classes.find((c) => c.name === className)?.streams ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchool) {
      toast({ title: 'No active school', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    // Validate subject assignments
    const cleanSubjects = subjectAssignments.filter(
      (a) => a.subjectId && a.className && a.stream
    );
    if (subjectAssignments.length > 0 && cleanSubjects.length !== subjectAssignments.length) {
      toast({ title: 'Complete or remove incomplete subject rows', variant: 'destructive' });
      return;
    }

    const classTeacher =
      classTeacherClass && classTeacherStream
        ? { className: classTeacherClass, stream: classTeacherStream }
        : null;

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('create-teacher', {
      body: {
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        initials: initials.trim() || null,
        school_id: activeSchool.id,
        subject_assignments: cleanSubjects,
        class_teacher: classTeacher,
      },
    });
    setLoading(false);

    if (error || (data as any)?.error) {
      toast({
        title: 'Failed to create teacher',
        description: (data as any)?.error || error?.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Teacher created', description: `${fullName} can now sign in.` });
    reset();
    setOpen(false);
  };

  if (!activeSchool) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Teacher to {activeSchool.name}</DialogTitle>
          <DialogDescription>
            Create a teacher account and assign their subjects and class responsibilities.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="t-name">Full Name</Label>
              <Input id="t-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Enter full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-init">Initials</Label>
              <Input id="t-init" value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase())} maxLength={6} placeholder="e.g. JKM" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-email">Email</Label>
              <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="teacher@school.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value="Teacher" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-pass">Password</Label>
              <Input id="t-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Create a password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-pass2">Confirm Password</Label>
              <Input id="t-pass2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} placeholder="Confirm password" />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Subject Teacher</h3>
              <Button type="button" size="sm" variant="outline" onClick={addSubjectRow}>
                <Plus className="h-4 w-4 mr-1" /> Add Subject
              </Button>
            </div>
            {subjectAssignments.length === 0 && (
              <p className="text-sm text-muted-foreground">No subject assignments added yet.</p>
            )}
            {subjectAssignments.map((row, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5 space-y-1">
                  <Label className="text-xs">Subject</Label>
                  <Select value={row.subjectId} onValueChange={(v) => updateSubjectRow(idx, { subjectId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Class</Label>
                  <Select value={row.className} onValueChange={(v) => updateSubjectRow(idx, { className: v, stream: '' })}>
                    <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Stream</Label>
                  <Select value={row.stream} onValueChange={(v) => updateSubjectRow(idx, { stream: v })} disabled={!row.className}>
                    <SelectTrigger><SelectValue placeholder="Stream" /></SelectTrigger>
                    <SelectContent>
                      {streamsFor(row.className).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => removeSubjectRow(idx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="text-base font-semibold">Class Teacher (Optional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Class</Label>
                <Select
                  value={classTeacherClass || 'none'}
                  onValueChange={(v) => {
                    if (v === 'none') { setClassTeacherClass(''); setClassTeacherStream(''); }
                    else { setClassTeacherClass(v); setClassTeacherStream(''); }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stream</Label>
                <Select
                  value={classTeacherStream || 'none'}
                  onValueChange={(v) => setClassTeacherStream(v === 'none' ? '' : v)}
                  disabled={!classTeacherClass}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {streamsFor(classTeacherClass).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

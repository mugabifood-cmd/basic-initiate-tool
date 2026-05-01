import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSchool } from '@/hooks/useSchool';

export type SeedKind = 'classes' | 'subjects' | 'grades' | 'grade_comments' | 'comment_templates';

interface Props {
  kind: SeedKind;
  /** Called after successful seed so parent can refresh its data */
  onSeeded?: () => void;
}

const DEFAULT_CLASS_NAMES = ['S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6'];
const DEFAULT_TERMS = ['ONE', 'TWO', 'THREE'];

const DEFAULT_SUBJECTS: { code: string; name: string }[] = [
  { code: 'MTC', name: 'Mathematics' },
  { code: 'ENG', name: 'English' },
  { code: 'BIO', name: 'Biology' },
  { code: 'CHE', name: 'Chemistry' },
  { code: 'PHY', name: 'Physics' },
  { code: 'GEO', name: 'Geography' },
  { code: 'LIT', name: 'Literature' },
  { code: 'KIS', name: 'Kiswahili' },
  { code: 'ICT', name: 'ICT' },
  { code: 'ART', name: 'Fine Art' },
  { code: 'COM', name: 'Commerce' },
  { code: 'ENT', name: 'Entrepreneurship' },
  { code: 'CRE', name: 'Christian Religious Education' },
  { code: 'IRE', name: 'Islamic Religious Education' },
  { code: 'LUG', name: 'Luganda' },
  { code: 'PE', name: 'Physical Education' },
  { code: 'HIS', name: 'History' },
  { code: 'AGR', name: 'Agriculture' },
];

const DEFAULT_GRADES: { grade: string; min: number; max: number }[] = [
  { grade: 'A', min: 80, max: 100 },
  { grade: 'B', min: 70, max: 79 },
  { grade: 'C', min: 60, max: 69 },
  { grade: 'D', min: 50, max: 59 },
  { grade: 'F', min: 0, max: 49 },
];

const DEFAULT_GRADE_COMMENTS: { grade: string; cls: string; ht: string }[] = [
  { grade: 'A', cls: 'Excellent performance. Keep it up!', ht: 'An outstanding result. Maintain this standard.' },
  { grade: 'B', cls: 'Very good work. A little more effort will earn an A.', ht: 'Very good. Push a bit harder for excellence.' },
  { grade: 'C', cls: 'Fair performance. Put in more effort.', ht: 'Average. More effort is required to improve.' },
  { grade: 'D', cls: 'Below average. Needs serious revision.', ht: 'Poor performance. Seek extra help and revise.' },
  { grade: 'F', cls: 'Failed. Urgent attention needed.', ht: 'Unacceptable. A serious change in attitude is required.' },
];

const DEFAULT_COMMENT_TEMPLATES: { min: number; max: number; cls: string; ht: string }[] = [
  { min: 80, max: 100, cls: 'Excellent performance. Keep it up!', ht: 'An outstanding result. Maintain this standard.' },
  { min: 70, max: 79, cls: 'Very good work. A little more effort will earn an A.', ht: 'Very good. Push a bit harder for excellence.' },
  { min: 60, max: 69, cls: 'Fair performance. Put in more effort.', ht: 'Average. More effort is required to improve.' },
  { min: 50, max: 59, cls: 'Below average. Needs serious revision.', ht: 'Poor performance. Seek extra help and revise.' },
  { min: 0, max: 49, cls: 'Failed. Urgent attention needed.', ht: 'Unacceptable. A serious change in attitude is required.' },
];

const KIND_LABEL: Record<SeedKind, string> = {
  classes: 'classes (S.1 – S.6, all 3 terms)',
  subjects: 'common subjects',
  grades: 'grade boundaries (A–F)',
  grade_comments: 'report card comments per grade',
  comment_templates: 'auto-comment templates by score range',
};

export default function SeedDefaultsButton({ kind, onSeeded }: Props) {
  const { activeSchool } = useSchool();
  const [alreadySeeded, setAlreadySeeded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const needsSchool = kind === 'classes' || kind === 'subjects';

  useEffect(() => {
    checkSeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchool?.id, kind]);

  const checkSeeded = async () => {
    setLoading(true);
    try {
      if (needsSchool) {
        if (!activeSchool?.id) {
          setAlreadySeeded(false);
          return;
        }
        if (kind === 'classes') {
          const { data } = await supabase
            .from('classes')
            .select('name,term')
            .eq('school_id', activeSchool.id)
            .in('name', DEFAULT_CLASS_NAMES);
          const levels = new Set((data || []).map((c) => c.name));
          setAlreadySeeded(DEFAULT_CLASS_NAMES.every((n) => levels.has(n)));
        } else if (kind === 'subjects') {
          const { data } = await supabase
            .from('subjects')
            .select('name')
            .eq('school_id', activeSchool.id)
            .in('name', DEFAULT_SUBJECTS.map((s) => s.name));
          const names = new Set((data || []).map((s) => s.name));
          setAlreadySeeded(DEFAULT_SUBJECTS.every((s) => names.has(s.name)));
        }
      } else if (kind === 'grades') {
        const { data } = await supabase
          .from('grade_boundaries')
          .select('grade')
          .in('grade', DEFAULT_GRADES.map((g) => g.grade));
        const set = new Set((data || []).map((g) => g.grade));
        setAlreadySeeded(DEFAULT_GRADES.every((g) => set.has(g.grade)));
      } else if (kind === 'grade_comments') {
        const { data } = await supabase
          .from('grade_comments')
          .select('grade')
          .in('grade', DEFAULT_GRADE_COMMENTS.map((g) => g.grade));
        const set = new Set((data || []).map((g) => g.grade));
        setAlreadySeeded(DEFAULT_GRADE_COMMENTS.every((g) => set.has(g.grade)));
      } else if (kind === 'comment_templates') {
        const { data } = await supabase
          .from('comment_templates')
          .select('min_percentage,max_percentage');
        const set = new Set((data || []).map((c) => `${c.min_percentage}-${c.max_percentage}`));
        setAlreadySeeded(DEFAULT_COMMENT_TEMPLATES.every((t) => set.has(`${t.min}-${t.max}`)));
      }
    } catch (err) {
      console.error('seed check failed', err);
    } finally {
      setLoading(false);
    }
  };

  const seed = async () => {
    if (needsSchool && !activeSchool?.id) {
      toast({ title: 'No school selected', description: 'Pick a school first.', variant: 'destructive' });
      return;
    }
    setWorking(true);
    try {
      if (kind === 'classes') {
        const year = new Date().getFullYear().toString();
        const { data: existing } = await supabase
          .from('classes')
          .select('name,stream,term,academic_year')
          .eq('school_id', activeSchool!.id);
        const seen = new Set(
          (existing || []).map((c) => `${c.name}|${c.stream}|${c.term}|${c.academic_year}`),
        );
        const rows = [];
        for (const name of DEFAULT_CLASS_NAMES) {
          for (const term of DEFAULT_TERMS) {
            const key = `${name}|A|${term}|${year}`;
            if (seen.has(key)) continue;
            rows.push({
              school_id: activeSchool!.id,
              name,
              stream: 'A',
              term,
              academic_year: year,
            });
          }
        }
        if (rows.length) {
          const { error } = await supabase.from('classes').insert(rows);
          if (error) throw error;
        }
        toast({ title: 'Classes seeded', description: `Inserted ${rows.length} new class(es).` });
      } else if (kind === 'subjects') {
        const { data: existing } = await supabase
          .from('subjects')
          .select('name,code')
          .eq('school_id', activeSchool!.id);
        const names = new Set((existing || []).map((s) => s.name.toLowerCase()));
        const codes = new Set((existing || []).map((s) => s.code.toUpperCase()));
        const rows = DEFAULT_SUBJECTS.filter(
          (s) => !names.has(s.name.toLowerCase()) && !codes.has(s.code.toUpperCase()),
        ).map((s) => ({ school_id: activeSchool!.id, name: s.name, code: s.code }));
        if (rows.length) {
          const { error } = await supabase.from('subjects').insert(rows);
          if (error) throw error;
        }
        toast({ title: 'Subjects seeded', description: `Inserted ${rows.length} new subject(s).` });
      } else if (kind === 'grades') {
        const { data: existing } = await supabase.from('grade_boundaries').select('grade');
        const seen = new Set((existing || []).map((g) => g.grade.toUpperCase()));
        const rows = DEFAULT_GRADES.filter((g) => !seen.has(g.grade)).map((g) => ({
          grade: g.grade,
          min_score: g.min,
          max_score: g.max,
        }));
        if (rows.length) {
          const { error } = await supabase.from('grade_boundaries').insert(rows);
          if (error) throw error;
        }
        toast({ title: 'Grade boundaries seeded', description: `Inserted ${rows.length} new grade(s).` });
      } else if (kind === 'grade_comments') {
        const { data: existing } = await supabase.from('grade_comments').select('grade');
        const seen = new Set((existing || []).map((g) => g.grade.toUpperCase()));
        const rows = DEFAULT_GRADE_COMMENTS.filter((g) => !seen.has(g.grade)).map((g) => ({
          grade: g.grade,
          class_teacher_comment: g.cls,
          headteacher_comment: g.ht,
        }));
        if (rows.length) {
          const { error } = await supabase.from('grade_comments').insert(rows);
          if (error) throw error;
        }
        toast({ title: 'Grade comments seeded', description: `Inserted ${rows.length} new comment(s).` });
      } else if (kind === 'comment_templates') {
        const { data: existing } = await supabase
          .from('comment_templates')
          .select('min_percentage,max_percentage');
        const seen = new Set(
          (existing || []).map((c) => `${c.min_percentage}-${c.max_percentage}`),
        );
        const rows = DEFAULT_COMMENT_TEMPLATES.filter((t) => !seen.has(`${t.min}-${t.max}`)).map(
          (t) => ({
            min_percentage: t.min,
            max_percentage: t.max,
            class_teacher_comment: t.cls,
            headteacher_comment: t.ht,
          }),
        );
        if (rows.length) {
          const { error } = await supabase.from('comment_templates').insert(rows);
          if (error) throw error;
        }
        toast({
          title: 'Comment templates seeded',
          description: `Inserted ${rows.length} new template(s).`,
        });
      }
      await checkSeeded();
      onSeeded?.();
    } catch (err: any) {
      toast({
        title: 'Seed failed',
        description: err?.message || 'Could not insert defaults',
        variant: 'destructive',
      });
    } finally {
      setWorking(false);
    }
  };

  const disabled = loading || working || alreadySeeded || (needsSchool && !activeSchool?.id);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={disabled} title={alreadySeeded ? 'Defaults already applied' : 'Insert default data'}>
          {alreadySeeded ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {alreadySeeded ? 'Defaults Applied' : working ? 'Seeding…' : 'Seed Defaults'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Seed default {KIND_LABEL[kind]}?</AlertDialogTitle>
          <AlertDialogDescription>
            This adds standard {KIND_LABEL[kind]} so you can start quickly. Existing entries are kept;
            only missing ones are inserted. You can edit or delete any of them afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={seed}>Seed defaults</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

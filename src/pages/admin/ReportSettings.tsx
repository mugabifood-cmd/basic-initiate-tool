import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Type } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/hooks/useSchool';
import { toast } from '@/hooks/use-toast';

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Arial (default)', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Cambria', value: 'Cambria, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
];

export default function ReportSettings() {
  const { activeSchool, refreshSchools } = useSchool();
  const [font, setFont] = useState<string>('Arial, sans-serif');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!activeSchool) return;
      setLoading(true);
      const { data } = await supabase
        .from('schools')
        .select('report_font_family')
        .eq('id', activeSchool.id)
        .single();
      if (data?.report_font_family) setFont(data.report_font_family);
      setLoading(false);
    };
    load();
  }, [activeSchool]);

  const save = async () => {
    if (!activeSchool) return;
    setSaving(true);
    const { error } = await supabase
      .from('schools')
      .update({ report_font_family: font })
      .eq('id', activeSchool.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Settings saved', description: 'Report card font updated.' });
    await refreshSchools();
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" /> Report Card Settings
            </CardTitle>
            <CardDescription>
              Choose the font used for typed text on generated report cards for {activeSchool?.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Report Card Font</Label>
              <Select value={font} onValueChange={setFont} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a font" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border p-4 bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2">Preview</div>
              <div style={{ fontFamily: font }} className="space-y-1">
                <div className="text-lg font-bold">St. Example Secondary School</div>
                <div className="text-sm">Term One Report Card 2026</div>
                <div className="text-sm">Student: Jane Doe — S.3 Blue</div>
                <div className="text-sm">Mathematics — 82% — Grade A — Excellent work.</div>
              </div>
            </div>

            <Button onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

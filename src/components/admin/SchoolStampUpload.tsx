import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Stamp, Eye } from 'lucide-react';

interface SchoolStampUploadProps {
  schoolId?: string;
}

export default function SchoolStampUpload({ schoolId }: SchoolStampUploadProps) {
  const [stampUrl, setStampUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(schoolId || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (schoolId) {
      setCurrentSchoolId(schoolId);
      fetchStamp(schoolId);
    } else {
      fetchFirstSchool();
    }
  }, [schoolId]);

  const fetchFirstSchool = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, stamp_url')
        .limit(1)
        .single();

      if (error) throw error;
      setCurrentSchoolId(data.id);
      setStampUrl((data as any).stamp_url || null);
    } catch (error: any) {
      console.error('Error fetching school:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStamp = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('stamp_url')
        .eq('id', id)
        .single();

      if (error) throw error;
      setStampUrl((data as any).stamp_url || null);
    } catch (error: any) {
      console.error('Error fetching stamp:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSchoolId) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file.', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB.', variant: 'destructive' });
      return;
    }

    try {
      setUploading(true);
      const ext = file.name.split('.').pop();
      const filePath = `stamps/${currentSchoolId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('school-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('school-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('schools')
        .update({ stamp_url: publicUrl } as any)
        .eq('id', currentSchoolId);

      if (updateError) throw updateError;

      setStampUrl(publicUrl);
      toast({ title: 'Stamp uploaded', description: 'School stamp has been saved successfully.' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!currentSchoolId) return;
    try {
      const { error } = await supabase
        .from('schools')
        .update({ stamp_url: null } as any)
        .eq('id', currentSchoolId);

      if (error) throw error;
      setStampUrl(null);
      toast({ title: 'Stamp removed', description: 'School stamp has been removed.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Stamp className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">School Stamp</CardTitle>
        </div>
        <CardDescription>
          Upload the school's official stamp image. This stamp can be applied to generated report cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stampUrl ? (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Current Stamp Preview
              </p>
              <div className="flex justify-center bg-white rounded border p-4">
                <img
                  src={stampUrl}
                  alt="School Stamp"
                  className="max-h-32 object-contain"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Replace Stamp'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemove}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Stamp
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Stamp className="h-4 w-4" />
              <AlertDescription>
                No stamp uploaded yet. Upload a PNG or JPG image of the school's official stamp.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload School Stamp'}
            </Button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}

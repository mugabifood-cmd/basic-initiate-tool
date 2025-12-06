import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import SignaturePad from './SignaturePad';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function TeacherSignatureSection() {
  const { profile } = useAuth();
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkClassTeacherAssignment();
  }, [profile?.id]);

  const checkClassTeacherAssignment = async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('teacher_id', profile.id)
        .eq('assignment_type', 'class_teacher')
        .limit(1);

      if (error) throw error;
      
      setIsClassTeacher(data && data.length > 0);
    } catch (error) {
      console.error('Error checking class teacher assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isClassTeacher) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Digital Signature (Class Teacher Only)</h3>
      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          As a class teacher, your digital signature will automatically appear on all report cards for your assigned class.
        </AlertDescription>
      </Alert>
      <SignaturePad
        profileId={profile?.id || null}
        signatureType="class_teacher"
        title="Your Digital Signature"
        description="Draw your signature using your finger or stylus. This will appear on student report cards."
      />
    </div>
  );
}
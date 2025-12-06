import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Pen, RotateCcw, Save, Eye } from 'lucide-react';

interface SignaturePadProps {
  profileId: string | null;
  signatureType: 'class_teacher' | 'headteacher';
  title: string;
  description?: string;
}

export default function SignaturePad({ profileId, signatureType, title, description }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSignature();
  }, [profileId, signatureType]);

  const fetchSignature = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('signatures')
        .select('signature_data')
        .eq('signature_type', signatureType);

      if (signatureType === 'headteacher') {
        query = query.is('profile_id', null);
      } else if (profileId) {
        query = query.eq('profile_id', profileId);
      } else {
        setIsLoading(false);
        return;
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      if (data?.signature_data) {
        setSavedSignature(data.signature_data);
        setShowPreview(true);
      }
    } catch (error: any) {
      console.error('Error fetching signature:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSave = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast({
        title: "Empty Signature",
        description: "Please draw your signature before saving.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSaving(true);
      const signatureData = sigCanvas.current.toDataURL('image/png');

      // Upsert the signature
      const { error } = await supabase
        .from('signatures')
        .upsert({
          profile_id: signatureType === 'headteacher' ? null : profileId,
          signature_type: signatureType,
          signature_data: signatureData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: signatureType === 'headteacher' 
            ? 'signature_type' 
            : 'profile_id,signature_type'
        });

      if (error) throw error;

      setSavedSignature(signatureData);
      setShowPreview(true);
      toast({
        title: "Signature Saved",
        description: "Your digital signature has been saved successfully."
      });
    } catch (error: any) {
      console.error('Error saving signature:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save signature.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = () => {
    setShowPreview(false);
    setSavedSignature(null);
    setTimeout(() => {
      sigCanvas.current?.clear();
    }, 100);
  };

  if (isLoading) {
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
          <Pen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showPreview && savedSignature ? (
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Your Signature Preview
              </p>
              <div className="flex justify-center bg-white rounded border p-2">
                <img 
                  src={savedSignature} 
                  alt="Saved Signature" 
                  className="max-h-24 object-contain"
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleChange}
              className="w-full"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Change / Update Signature
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-2 bg-white">
              <p className="text-xs text-muted-foreground text-center mb-2">
                Draw your signature below using finger or stylus
              </p>
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{
                  className: 'w-full h-32 border rounded cursor-crosshair touch-none',
                  style: { touchAction: 'none' }
                }}
                backgroundColor="white"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClear}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Signature'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
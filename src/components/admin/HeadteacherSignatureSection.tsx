import SignaturePad from '../SignaturePad';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function HeadteacherSignatureSection() {
  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          The headteacher's digital signature will automatically appear on all generated report cards.
        </AlertDescription>
      </Alert>
      <SignaturePad
        profileId={null}
        signatureType="headteacher"
        title="Headteacher's Digital Signature"
        description="Draw the headteacher's signature using finger or stylus. This will appear on all student report cards."
      />
    </div>
  );
}
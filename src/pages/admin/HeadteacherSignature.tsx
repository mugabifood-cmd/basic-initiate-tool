import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import HeadteacherSignatureSection from '@/components/admin/HeadteacherSignatureSection';
export default function HeadteacherSignature() {
  return <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="ml-4 text-xl font-semibold">Headteacher Signature</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Digital Signature</h2>
          <p className="text-muted-foreground">
            Manage the headteacher's digital signature that will appear on all generated report cards.
          </p>
        </div>

        <HeadteacherSignatureSection />
      </main>
    </div>;
}
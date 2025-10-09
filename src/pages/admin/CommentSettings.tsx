import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import GradeSettingsTab from '@/components/admin/GradeSettingsTab';
import ReportCommentsTab from '@/components/admin/ReportCommentsTab';
export default function CommentSettings() {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Grade & Comments Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="comments" orientation="vertical" className="flex gap-6">
              <TabsList className="flex flex-col h-fit w-48 bg-blue-700">
                <TabsTrigger value="grades" className="w-full justify-start">
                  Grade Settings
                </TabsTrigger>
                <TabsTrigger value="comments" className="w-full justify-start">
                  Report Comments
                </TabsTrigger>
              </TabsList>
              
              <div className="flex-1">
                <TabsContent value="grades" className="mt-0">
                  <GradeSettingsTab />
                </TabsContent>
                
                <TabsContent value="comments" className="mt-0">
                  <ReportCommentsTab />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>;
}
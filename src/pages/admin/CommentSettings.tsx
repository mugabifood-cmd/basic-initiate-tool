import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import GradeSettingsTab from '@/components/admin/GradeSettingsTab';
import CommentTemplatesTab from '@/components/admin/CommentTemplatesTab';
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
            <Tabs defaultValue="comments" className="w-full">
              <TabsList className="flex justify-center gap-4 mb-6">
                <TabsTrigger value="grades">
                  Grade Settings
                </TabsTrigger>
                <TabsTrigger value="comments">
                  Comment Templates
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="grades" className="mt-0">
                <GradeSettingsTab />
              </TabsContent>
              
              <TabsContent value="comments" className="mt-0">
                <CommentTemplatesTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>;
}
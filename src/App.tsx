import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import SchoolManagement from './pages/admin/SchoolManagement';
import TeacherManagement from './pages/admin/TeacherManagement';
import Approvals from './pages/admin/Approvals';
import GenerateReports from './pages/admin/GenerateReports';
import ReportManagement from './pages/admin/ReportManagement';
import CommentSettings from './pages/admin/CommentSettings';
import TeacherSubmissions from './pages/teacher/TeacherSubmissions';
import MySubmissions from './pages/teacher/MySubmissions';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/auth" element={<Auth />} />
                
                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                
                {/* Admin Routes */}
                <Route path="/admin/schools" element={
                  <ProtectedRoute roles={['admin']}>
                    <SchoolManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/teachers" element={
                  <ProtectedRoute roles={['admin']}>
                    <TeacherManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/approvals" element={
                  <ProtectedRoute roles={['admin']}>
                    <Approvals />
                  </ProtectedRoute>
                } />
                <Route path="/admin/generate" element={
                  <ProtectedRoute roles={['admin']}>
                    <GenerateReports />
                  </ProtectedRoute>
                } />
                <Route path="/admin/reports" element={
                  <ProtectedRoute roles={['admin']}>
                    <ReportManagement />
                  </ProtectedRoute>
                } />
                <Route path="/admin/comments" element={
                  <ProtectedRoute roles={['admin']}>
                    <CommentSettings />
                  </ProtectedRoute>
                } />
                
                {/* Teacher Routes */}
                <Route path="/teacher/submissions" element={
                  <ProtectedRoute roles={['teacher', 'headteacher']}>
                    <TeacherSubmissions />
                  </ProtectedRoute>
                } />
                <Route path="/teacher/my-submissions" element={
                  <ProtectedRoute roles={['teacher', 'headteacher']}>
                    <MySubmissions />
                  </ProtectedRoute>
                } />
                
                {/* Default Redirects */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              <Toaster />
              <Sonner />
            </div>
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

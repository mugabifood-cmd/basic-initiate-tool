import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, FileText, CheckCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { profile, signOut } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'headteacher': return 'bg-purple-100 text-purple-800';
      case 'teacher': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMenuItems = () => {
    if (profile?.role === 'admin') {
      return [
        {
          title: 'School Management',
          description: 'Manage schools, classes, students, and subjects',
          icon: Settings,
          link: '/admin/schools',
          color: 'bg-blue-50 hover:bg-blue-100'
        },
        {
          title: 'Teacher Management',
          description: 'Manage teacher assignments and responsibilities',
          icon: Users,
          link: '/admin/teachers',
          color: 'bg-indigo-50 hover:bg-indigo-100'
        },
        {
          title: 'Approve Submissions',
          description: 'Review and approve teacher submissions',
          icon: CheckCircle,
          link: '/admin/approvals',
          color: 'bg-green-50 hover:bg-green-100'
        },
        {
          title: 'Generate Report Cards',
          description: 'Create report cards for students',
          icon: FileText,
          link: '/admin/generate',
          color: 'bg-purple-50 hover:bg-purple-100'
        },
        {
          title: 'Report Card Management',
          description: 'View, edit, and manage generated report cards',
          icon: FileText,
          link: '/admin/reports',
          color: 'bg-orange-50 hover:bg-orange-100'
        }
      ];
    } else {
      return [
        {
          title: 'Submit Marks',
          description: 'Enter marks and comments for your subjects',
          icon: FileText,
          link: '/teacher/submissions',
          color: 'bg-blue-50 hover:bg-blue-100'
        },
        {
          title: 'My Submissions',
          description: 'View your submitted marks and their status',
          icon: CheckCircle,
          link: '/teacher/my-submissions',
          color: 'bg-green-50 hover:bg-green-100'
        }
      ];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                O-Level Report Card System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <Badge className={getRoleColor(profile?.role || '')}>
                  {profile?.role?.toUpperCase()}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {profile?.full_name}!
          </h2>
          <p className="text-gray-600">
            {profile?.role === 'admin' 
              ? 'Manage your school\'s report card system from this dashboard.'
              : 'Submit marks and manage your subject submissions.'
            }
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getMenuItems().map((item, index) => (
            <Link key={index} to={item.link}>
              <Card className={`cursor-pointer transition-colors ${item.color}`}>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <item.icon className="w-6 h-6 text-gray-700" />
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-600">Pending Submissions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">Approved Submissions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">0</div>
                <div className="text-sm text-gray-600">Generated Reports</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">0</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface School {
  id: string;
  name: string;
  location: string;
  po_box: string;
  telephone: string;
  email: string;
  website: string;
  motto: string;
}

interface Class {
  id: string;
  name: string;
  stream: string;
  academic_year: string;
  term: string;
  schools: {
    id: string;
    name: string;
    location: string;
  } | null;
}

interface Student {
  id: string;
  student_number: string;
  full_name: string;
  gender: string;
  house: string;
  age: number;
}

interface Subject {
  id: string;
  code: string;
  name: string;
}

export default function SchoolManagement() {
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [schoolForm, setSchoolForm] = useState({
    name: '', location: '', po_box: '', telephone: '', email: '', website: '', motto: ''
  });
  const [classForm, setClassForm] = useState({
    school_id: '', name: '', stream: '', academic_year: '2025', term: 'ONE'
  });
  const [studentForm, setStudentForm] = useState({
    school_id: '', student_number: '', full_name: '', gender: 'MALE', house: '', age: 16
  });
  const [subjectForm, setSubjectForm] = useState({
    school_id: '', code: '', name: ''
  });

  // Edit and delete states
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch schools
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('*')
        .order('name');
      
      // Fetch classes with school info
      const { data: classesData } = await supabase
        .from('classes')
        .select(`
          *,
          schools (
            id, name, location
          )
        `)
        .order('name');
      
      // Fetch students
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .order('full_name');
      
      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      setSchools(schoolsData || []);
      setClasses((classesData as any) || []);
      setStudents(studentsData || []);
      setSubjects(subjectsData || []);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('schools')
        .insert([schoolForm]);

      if (error) throw error;

      toast({ title: "School created successfully" });
      setSchoolForm({ name: '', location: '', po_box: '', telephone: '', email: '', website: '', motto: '' });
      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error creating school",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('classes')
        .insert([classForm]);

      if (error) throw error;

      toast({ title: "Class created successfully" });
      setClassForm({ school_id: '', name: '', stream: '', academic_year: '2025', term: 'ONE' });
      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error creating class",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('students')
        .insert([{ ...studentForm, age: Number(studentForm.age) }]);

      if (error) throw error;

      toast({ title: "Student created successfully" });
      setStudentForm({ school_id: '', student_number: '', full_name: '', gender: 'MALE', house: '', age: 16 });
      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error creating student",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('subjects')
        .insert([subjectForm]);

      if (error) throw error;

      toast({ title: "Subject created successfully" });
      setSubjectForm({ school_id: '', code: '', name: '' });
      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error creating subject",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Update handlers
  const handleUpdateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;

    try {
      const { error } = await supabase
        .from('schools')
        .update(schoolForm)
        .eq('id', editingSchool.id);

      if (error) throw error;

      toast({ title: "School updated successfully" });
      setEditingSchool(null);
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error updating school",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    try {
      const { error } = await supabase
        .from('classes')
        .update(classForm)
        .eq('id', editingClass.id);

      if (error) throw error;

      toast({ title: "Class updated successfully" });
      setEditingClass(null);
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error updating class",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      const { error } = await supabase
        .from('students')
        .update({ ...studentForm, age: Number(studentForm.age) })
        .eq('id', editingStudent.id);

      if (error) throw error;

      toast({ title: "Student updated successfully" });
      setEditingStudent(null);
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error updating student",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .update(subjectForm)
        .eq('id', editingSubject.id);

      if (error) throw error;

      toast({ title: "Subject updated successfully" });
      setEditingSubject(null);
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error updating subject",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      let query;
      switch (deleteItem.type) {
        case 'schools':
          query = supabase.from('schools').delete().eq('id', deleteItem.id);
          break;
        case 'classes':
          query = supabase.from('classes').delete().eq('id', deleteItem.id);
          break;
        case 'students':
          query = supabase.from('students').delete().eq('id', deleteItem.id);
          break;
        case 'subjects':
          query = supabase.from('subjects').delete().eq('id', deleteItem.id);
          break;
        default:
          throw new Error('Invalid table type');
      }

      const { error } = await query;
      if (error) throw error;

      toast({ title: `${deleteItem.type.slice(0, -1)} deleted successfully` });
      setDeleteItem(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deleting item",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Edit handlers
  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setSchoolForm({
      name: school.name,
      location: school.location || '',
      po_box: school.po_box || '',
      telephone: school.telephone || '',
      email: school.email || '',
      website: school.website || '',
      motto: school.motto || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleEditClass = (classItem: Class) => {
    setEditingClass(classItem);
    setClassForm({
      school_id: classItem.schools?.id || '',
      name: classItem.name,
      stream: classItem.stream,
      academic_year: classItem.academic_year,
      term: classItem.term
    });
    setIsEditDialogOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      school_id: '', // We don't have this in the student data
      student_number: student.student_number,
      full_name: student.full_name,
      gender: student.gender,
      house: student.house || '',
      age: student.age
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({
      school_id: '', // We don't have this in the subject data
      code: subject.code,
      name: subject.name
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">School Management</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="schools">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="schools">Schools</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
          </TabsList>

          {/* Schools Tab */}
          <TabsContent value="schools">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Schools</CardTitle>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setSchoolForm({ name: '', location: '', po_box: '', telephone: '', email: '', website: '', motto: '' });
                      setIsCreateDialogOpen(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add School
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New School</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSchool} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="school-name">School Name</Label>
                          <Input
                            id="school-name"
                            value={schoolForm.name}
                            onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={schoolForm.location}
                            onChange={(e) => setSchoolForm({ ...schoolForm, location: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="po-box">P.O Box</Label>
                          <Input
                            id="po-box"
                            value={schoolForm.po_box}
                            onChange={(e) => setSchoolForm({ ...schoolForm, po_box: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="telephone">Telephone</Label>
                          <Input
                            id="telephone"
                            value={schoolForm.telephone}
                            onChange={(e) => setSchoolForm({ ...schoolForm, telephone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={schoolForm.email}
                            onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="website">Website</Label>
                          <Input
                            id="website"
                            value={schoolForm.website}
                            onChange={(e) => setSchoolForm({ ...schoolForm, website: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="motto">School Motto</Label>
                        <Input
                          id="motto"
                          value={schoolForm.motto}
                          onChange={(e) => setSchoolForm({ ...schoolForm, motto: e.target.value })}
                        />
                      </div>
                      <Button type="submit" className="w-full">Create School</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                
                {/* Edit School Dialog */}
                <Dialog open={isEditDialogOpen && editingSchool !== null} onOpenChange={(open) => {
                  if (!open) {
                    setIsEditDialogOpen(false);
                    setEditingSchool(null);
                  }
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit School</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateSchool} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-school-name">School Name</Label>
                          <Input
                            id="edit-school-name"
                            value={schoolForm.name}
                            onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-location">Location</Label>
                          <Input
                            id="edit-location"
                            value={schoolForm.location}
                            onChange={(e) => setSchoolForm({ ...schoolForm, location: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-po-box">P.O Box</Label>
                          <Input
                            id="edit-po-box"
                            value={schoolForm.po_box}
                            onChange={(e) => setSchoolForm({ ...schoolForm, po_box: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-telephone">Telephone</Label>
                          <Input
                            id="edit-telephone"
                            value={schoolForm.telephone}
                            onChange={(e) => setSchoolForm({ ...schoolForm, telephone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-email">Email</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={schoolForm.email}
                            onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-website">Website</Label>
                          <Input
                            id="edit-website"
                            value={schoolForm.website}
                            onChange={(e) => setSchoolForm({ ...schoolForm, website: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="edit-motto">School Motto</Label>
                        <Input
                          id="edit-motto"
                          value={schoolForm.motto}
                          onChange={(e) => setSchoolForm({ ...schoolForm, motto: e.target.value })}
                        />
                      </div>
                      <Button type="submit" className="w-full">Update School</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        <TableCell>{school.location}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{school.telephone}</div>
                            <div className="text-gray-500">{school.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditSchool(school)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDeleteItem({ type: 'schools', id: school.id, name: school.name })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Classes</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Class</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateClass} className="space-y-4">
                      <div>
                        <Label htmlFor="class-school">School</Label>
                        <Select value={classForm.school_id} onValueChange={(value) => setClassForm({ ...classForm, school_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select school" />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="class-name">Class Name</Label>
                          <Input
                            id="class-name"
                            placeholder="e.g., S.1, S.2"
                            value={classForm.name}
                            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="stream">Stream</Label>
                          <Input
                            id="stream"
                            placeholder="e.g., East, West, Boarding"
                            value={classForm.stream}
                            onChange={(e) => setClassForm({ ...classForm, stream: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="academic-year">Academic Year</Label>
                          <Input
                            id="academic-year"
                            value={classForm.academic_year}
                            onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="term">Term</Label>
                          <Select value={classForm.term} onValueChange={(value) => setClassForm({ ...classForm, term: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ONE">Term One</SelectItem>
                              <SelectItem value="TWO">Term Two</SelectItem>
                              <SelectItem value="THREE">Term Three</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="submit" className="w-full">Create Class</Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit Class Dialog */}
                <Dialog open={isEditDialogOpen && editingClass !== null} onOpenChange={(open) => {
                  if (!open) {
                    setIsEditDialogOpen(false);
                    setEditingClass(null);
                  }
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Class</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateClass} className="space-y-4">
                      <div>
                        <Label htmlFor="edit-class-school">School</Label>
                        <Select value={classForm.school_id} onValueChange={(value) => setClassForm({ ...classForm, school_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select school" />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-class-name">Class Name</Label>
                          <Input
                            id="edit-class-name"
                            placeholder="e.g., S.1, S.2"
                            value={classForm.name}
                            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-stream">Stream</Label>
                          <Input
                            id="edit-stream"
                            placeholder="e.g., East, West, Boarding"
                            value={classForm.stream}
                            onChange={(e) => setClassForm({ ...classForm, stream: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-academic-year">Academic Year</Label>
                          <Input
                            id="edit-academic-year"
                            value={classForm.academic_year}
                            onChange={(e) => setClassForm({ ...classForm, academic_year: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-term">Term</Label>
                          <Select value={classForm.term} onValueChange={(value) => setClassForm({ ...classForm, term: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ONE">Term One</SelectItem>
                              <SelectItem value="TWO">Term Two</SelectItem>
                              <SelectItem value="THREE">Term Three</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button type="submit" className="w-full">Update Class</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.map((classItem) => (
                      <TableRow key={classItem.id}>
                        <TableCell className="font-medium">
                          {classItem.name} {classItem.stream}
                        </TableCell>
                        <TableCell>{classItem.schools?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{classItem.term}</Badge>
                        </TableCell>
                        <TableCell>{classItem.academic_year}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditClass(classItem)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDeleteItem({ type: 'classes', id: classItem.id, name: `${classItem.name} ${classItem.stream}` })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Students</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Student</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateStudent} className="space-y-4">
                      <div>
                        <Label htmlFor="student-school">School</Label>
                        <Select value={studentForm.school_id} onValueChange={(value) => setStudentForm({ ...studentForm, school_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select school" />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="student-number">Student Number</Label>
                          <Input
                            id="student-number"
                            value={studentForm.student_number}
                            onChange={(e) => setStudentForm({ ...studentForm, student_number: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="full-name">Full Name</Label>
                          <Input
                            id="full-name"
                            value={studentForm.full_name}
                            onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="gender">Gender</Label>
                          <Select value={studentForm.gender} onValueChange={(value) => setStudentForm({ ...studentForm, gender: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="house">House</Label>
                          <Input
                            id="house"
                            value={studentForm.house}
                            onChange={(e) => setStudentForm({ ...studentForm, house: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="age">Age</Label>
                          <Input
                            id="age"
                            type="number"
                            value={studentForm.age}
                            onChange={(e) => setStudentForm({ ...studentForm, age: Number(e.target.value) })}
                            min="10"
                            max="25"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">Create Student</Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit Student Dialog */}
                <Dialog open={isEditDialogOpen && editingStudent !== null} onOpenChange={(open) => {
                  if (!open) {
                    setIsEditDialogOpen(false);
                    setEditingStudent(null);
                  }
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Student</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateStudent} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-student-number">Student Number</Label>
                          <Input
                            id="edit-student-number"
                            value={studentForm.student_number}
                            onChange={(e) => setStudentForm({ ...studentForm, student_number: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-full-name">Full Name</Label>
                          <Input
                            id="edit-full-name"
                            value={studentForm.full_name}
                            onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-gender">Gender</Label>
                          <Select value={studentForm.gender} onValueChange={(value) => setStudentForm({ ...studentForm, gender: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="edit-house">House</Label>
                          <Input
                            id="edit-house"
                            value={studentForm.house}
                            onChange={(e) => setStudentForm({ ...studentForm, house: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-age">Age</Label>
                          <Input
                            id="edit-age"
                            type="number"
                            value={studentForm.age}
                            onChange={(e) => setStudentForm({ ...studentForm, age: Number(e.target.value) })}
                            min="10"
                            max="25"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">Update Student</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Number</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>House</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.student_number}</TableCell>
                        <TableCell>{student.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{student.gender}</Badge>
                        </TableCell>
                        <TableCell>{student.house}</TableCell>
                        <TableCell>{student.age}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDeleteItem({ type: 'students', id: student.id, name: student.full_name })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Subjects</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Subject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Subject</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubject} className="space-y-4">
                      <div>
                        <Label htmlFor="subject-school">School</Label>
                        <Select value={subjectForm.school_id} onValueChange={(value) => setSubjectForm({ ...subjectForm, school_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select school" />
                          </SelectTrigger>
                          <SelectContent>
                            {schools.map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="subject-code">Subject Code</Label>
                          <Input
                            id="subject-code"
                            placeholder="e.g., 535, 112"
                            value={subjectForm.code}
                            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="subject-name">Subject Name</Label>
                          <Input
                            id="subject-name"
                            placeholder="e.g., Biology, English"
                            value={subjectForm.name}
                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">Create Subject</Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit Subject Dialog */}
                <Dialog open={isEditDialogOpen && editingSubject !== null} onOpenChange={(open) => {
                  if (!open) {
                    setIsEditDialogOpen(false);
                    setEditingSubject(null);
                  }
                }}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Subject</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateSubject} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-subject-code">Subject Code</Label>
                          <Input
                            id="edit-subject-code"
                            placeholder="e.g., 535, 112"
                            value={subjectForm.code}
                            onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-subject-name">Subject Name</Label>
                          <Input
                            id="edit-subject-name"
                            placeholder="e.g., Biology, English"
                            value={subjectForm.name}
                            onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">Update Subject</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Subject Name</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">{subject.code}</TableCell>
                        <TableCell>{subject.name}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditSubject(subject)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDeleteItem({ type: 'subjects', id: subject.id, name: subject.name })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteItem !== null} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteItem?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
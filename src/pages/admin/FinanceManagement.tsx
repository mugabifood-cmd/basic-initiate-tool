import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Upload, DollarSign, GraduationCap, CreditCard, History, Edit, Trash2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FeeStructure {
  id: string;
  school_id: string;
  class_name: string;
  stream: string | null;
  academic_year: string;
  term: string | null;
  billing_type: string;
  amount: number;
  description: string | null;
}

interface StudentPayment {
  id: string;
  student_id: string;
  school_id: string;
  academic_year: string;
  term: string | null;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  payment_date: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  students?: { full_name: string; student_number: string };
}

interface StudentBursary {
  id: string;
  student_id: string;
  bursary_type: string;
  custom_percentage: number;
  notes: string | null;
  students?: { full_name: string; student_number: string };
}

interface AuditLog {
  id: string;
  student_id: string | null;
  action_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  created_at: string;
  students?: { full_name: string } | null;
  profiles?: { full_name: string } | null;
}

export default function FinanceManagement() {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fee structures
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [feeForm, setFeeForm] = useState({ class_name: '', stream: '', academic_year: '', term: '', billing_type: 'per_term', amount: '', description: '' });

  // Payments
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ student_id: '', academic_year: '', term: '', amount: '', payment_method: 'cash', reference_number: '', payment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });

  // Bursaries
  const [bursaries, setBursaries] = useState<StudentBursary[]>([]);
  const [bursaryDialogOpen, setBursaryDialogOpen] = useState(false);
  const [bursaryForm, setBursaryForm] = useState({ student_id: '', bursary_type: 'none', custom_percentage: '0', notes: '' });

  // Audit log
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Loading states
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    if (selectedSchool) {
      fetchClasses();
      fetchFeeStructures();
      fetchPayments();
      fetchStudentsList();
    }
  }, [selectedSchool]);

  useEffect(() => {
    fetchBursaries();
    fetchAuditLogs();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name');
    if (data) {
      setSchools(data);
      if (data.length === 1) setSelectedSchool(data[0].id);
    }
  };

  const fetchClasses = async () => {
    const { data } = await supabase.from('classes').select('*').eq('school_id', selectedSchool);
    if (data) setClasses(data);
  };

  const fetchStudentsList = async () => {
    const { data } = await supabase.from('students').select('id, full_name, student_number').eq('school_id', selectedSchool);
    if (data) setStudents(data);
  };

  const fetchFeeStructures = async () => {
    const { data } = await supabase.from('fee_structures').select('*').eq('school_id', selectedSchool);
    if (data) setFeeStructures(data);
  };

  const fetchPayments = async () => {
    const { data } = await supabase.from('student_payments').select('*, students(full_name, student_number)').eq('school_id', selectedSchool).order('payment_date', { ascending: false });
    if (data) setPayments(data as any);
  };

  const fetchBursaries = async () => {
    const { data } = await supabase.from('student_bursaries').select('*, students(full_name, student_number)');
    if (data) setBursaries(data as any);
  };

  const fetchAuditLogs = async () => {
    const { data } = await supabase.from('fee_audit_log').select('*, students(full_name)').order('created_at', { ascending: false }).limit(100);
    if (data) setAuditLogs(data as any);
  };

  const logAudit = async (studentId: string | null, actionType: string, description: string, oldValue?: string, newValue?: string) => {
    await supabase.from('fee_audit_log').insert({
      student_id: studentId,
      action_type: actionType,
      description,
      old_value: oldValue || null,
      new_value: newValue || null,
      performed_by: profile?.id || null,
    });
  };

  // ===== FEE STRUCTURES =====
  const handleSaveFee = async () => {
    setSaving(true);
    try {
      const payload = {
        school_id: selectedSchool,
        class_name: feeForm.class_name,
        stream: feeForm.stream || null,
        academic_year: feeForm.academic_year,
        term: feeForm.term || null,
        billing_type: feeForm.billing_type,
        amount: parseFloat(feeForm.amount) || 0,
        description: feeForm.description || null,
      };

      if (editingFee) {
        await supabase.from('fee_structures').update(payload).eq('id', editingFee.id);
        await logAudit(null, 'fee_structure_updated', `Updated fee structure for ${payload.class_name}`, String(editingFee.amount), String(payload.amount));
      } else {
        await supabase.from('fee_structures').insert(payload);
        await logAudit(null, 'fee_structure_created', `Created fee structure for ${payload.class_name}: ${payload.amount}`);
      }

      toast({ title: 'Success', description: 'Fee structure saved.' });
      setFeeDialogOpen(false);
      setEditingFee(null);
      setFeeForm({ class_name: '', stream: '', academic_year: '', term: '', billing_type: 'per_term', amount: '', description: '' });
      fetchFeeStructures();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDeleteFee = async (id: string) => {
    await supabase.from('fee_structures').delete().eq('id', id);
    await logAudit(null, 'fee_structure_deleted', `Deleted fee structure ${id}`);
    fetchFeeStructures();
    toast({ title: 'Deleted', description: 'Fee structure removed.' });
  };

  // ===== PAYMENTS =====
  const handleSavePayment = async () => {
    setSaving(true);
    try {
      const payload = {
        student_id: paymentForm.student_id,
        school_id: selectedSchool,
        academic_year: paymentForm.academic_year,
        term: paymentForm.term || null,
        amount: parseFloat(paymentForm.amount) || 0,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes || null,
        recorded_by: profile?.id || null,
      };

      await supabase.from('student_payments').insert(payload);
      await logAudit(payload.student_id, 'payment_recorded', `Payment of ${payload.amount} recorded via ${payload.payment_method}`, undefined, String(payload.amount));

      toast({ title: 'Success', description: 'Payment recorded.' });
      setPaymentDialogOpen(false);
      setPaymentForm({ student_id: '', academic_year: '', term: '', amount: '', payment_method: 'cash', reference_number: '', payment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      fetchPayments();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDeletePayment = async (payment: StudentPayment) => {
    await supabase.from('student_payments').delete().eq('id', payment.id);
    await logAudit(payment.student_id, 'payment_deleted', `Deleted payment of ${payment.amount}`, String(payment.amount));
    fetchPayments();
    toast({ title: 'Deleted', description: 'Payment removed.' });
  };

  // ===== CSV IMPORT =====
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      toast({ title: 'Error', description: 'CSV must have a header row and at least one data row.', variant: 'destructive' });
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['student_number', 'amount', 'payment_date'];
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      toast({ title: 'Error', description: `Missing CSV columns: ${missing.join(', ')}. Required: student_number, amount, payment_date`, variant: 'destructive' });
      return;
    }

    let imported = 0;
    let failed = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      const student = students.find(s => s.student_number === row.student_number);
      if (!student) { failed++; continue; }

      const { error } = await supabase.from('student_payments').insert({
        student_id: student.id,
        school_id: selectedSchool,
        academic_year: row.academic_year || new Date().getFullYear().toString(),
        term: row.term || null,
        amount: parseFloat(row.amount) || 0,
        payment_method: (row.payment_method as any) || 'bank',
        reference_number: row.reference_number || null,
        payment_date: row.payment_date,
        notes: row.notes || 'CSV Import',
        recorded_by: profile?.id || null,
      });

      if (error) { failed++; } else { imported++; }
    }

    await logAudit(null, 'csv_import', `Imported ${imported} payments from CSV. ${failed} failed.`);
    toast({ title: 'CSV Import Complete', description: `${imported} imported, ${failed} failed.` });
    fetchPayments();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ===== BURSARIES =====
  const handleSaveBursary = async () => {
    setSaving(true);
    try {
      const existing = bursaries.find(b => b.student_id === bursaryForm.student_id);
      const payload = {
        student_id: bursaryForm.student_id,
        bursary_type: bursaryForm.bursary_type,
        custom_percentage: parseFloat(bursaryForm.custom_percentage) || 0,
        notes: bursaryForm.notes || null,
      };

      if (existing) {
        await supabase.from('student_bursaries').update(payload).eq('id', existing.id);
        await logAudit(payload.student_id, 'bursary_updated', `Updated bursary to ${payload.bursary_type}`, existing.bursary_type, payload.bursary_type);
      } else {
        await supabase.from('student_bursaries').insert(payload);
        await logAudit(payload.student_id, 'bursary_created', `Created bursary: ${payload.bursary_type}`);
      }

      toast({ title: 'Success', description: 'Bursary saved.' });
      setBursaryDialogOpen(false);
      setBursaryForm({ student_id: '', bursary_type: 'none', custom_percentage: '0', notes: '' });
      fetchBursaries();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const uniqueClassNames = [...new Set(classes.map(c => c.name))];
  const uniqueStreams = [...new Set(classes.map(c => c.stream))];
  const uniqueYears = [...new Set(classes.map(c => c.academic_year))];
  const uniqueTerms = [...new Set(classes.map(c => c.term))];

  const filteredPayments = payments.filter(p =>
    !searchTerm || p.students?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.students?.student_number?.includes(searchTerm)
  );

  const getBursaryLabel = (type: string, pct: number) => {
    switch (type) {
      case 'full': return 'Full Bursary (100%)';
      case 'half': return 'Half Bursary (50%)';
      case 'custom': return `Custom (${pct}%)`;
      default: return 'None';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 space-x-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Finance Management</h1>
              <p className="text-sm text-muted-foreground">Fee structures, payments, bursaries & audit trail</p>
            </div>
            {schools.length > 1 && (
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select School" /></SelectTrigger>
                <SelectContent>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!selectedSchool ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Select a school to manage finances.</CardContent></Card>
        ) : (
          <Tabs defaultValue="fees">
            <TabsList className="mb-4">
              <TabsTrigger value="fees"><DollarSign className="w-4 h-4 mr-1" />Fee Structures</TabsTrigger>
              <TabsTrigger value="payments"><CreditCard className="w-4 h-4 mr-1" />Payments</TabsTrigger>
              <TabsTrigger value="bursaries"><GraduationCap className="w-4 h-4 mr-1" />Bursaries</TabsTrigger>
              <TabsTrigger value="audit"><History className="w-4 h-4 mr-1" />Audit Log</TabsTrigger>
            </TabsList>

            {/* ===== FEE STRUCTURES TAB ===== */}
            <TabsContent value="fees">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Fee Structures</CardTitle>
                    <CardDescription>Define fees per class, term and billing type</CardDescription>
                  </div>
                  <Button onClick={() => { setEditingFee(null); setFeeForm({ class_name: '', stream: '', academic_year: '', term: '', billing_type: 'per_term', amount: '', description: '' }); setFeeDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" />Add Fee Structure
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Stream</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeStructures.map(fee => (
                        <TableRow key={fee.id}>
                          <TableCell>{fee.class_name}</TableCell>
                          <TableCell>{fee.stream || '-'}</TableCell>
                          <TableCell>{fee.academic_year}</TableCell>
                          <TableCell>{fee.term || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{fee.billing_type.replace('_', ' ')}</Badge></TableCell>
                          <TableCell className="font-medium">{Number(fee.amount).toLocaleString()}</TableCell>
                          <TableCell className="space-x-1">
                            <Button size="sm" variant="ghost" onClick={() => {
                              setEditingFee(fee);
                              setFeeForm({ class_name: fee.class_name, stream: fee.stream || '', academic_year: fee.academic_year, term: fee.term || '', billing_type: fee.billing_type, amount: String(fee.amount), description: fee.description || '' });
                              setFeeDialogOpen(true);
                            }}><Edit className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteFee(fee.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {feeStructures.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No fee structures defined yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== PAYMENTS TAB ===== */}
            <TabsContent value="payments">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Student Payments</CardTitle>
                    <CardDescription>Record and track all student payments</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVImport} className="hidden" />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-1" />Import CSV
                    </Button>
                    <Button onClick={() => { setPaymentForm({ student_id: '', academic_year: '', term: '', amount: '', payment_method: 'cash', reference_number: '', payment_date: format(new Date(), 'yyyy-MM-dd'), notes: '' }); setPaymentDialogOpen(true); }}>
                      <Plus className="w-4 h-4 mr-1" />Record Payment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search by student name or number..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Ref</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{p.students?.full_name || 'Unknown'}</TableCell>
                          <TableCell>{p.academic_year}</TableCell>
                          <TableCell>{p.term || '-'}</TableCell>
                          <TableCell className="font-medium">{Number(p.amount).toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline">{p.payment_method.replace('_', ' ')}</Badge></TableCell>
                          <TableCell>{p.payment_date}</TableCell>
                          <TableCell>{p.reference_number || '-'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => handleDeletePayment(p)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredPayments.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payments recorded yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== BURSARIES TAB ===== */}
            <TabsContent value="bursaries">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Bursaries & Scholarships</CardTitle>
                    <CardDescription>Configure student bursary types and percentages</CardDescription>
                  </div>
                  <Button onClick={() => { setBursaryForm({ student_id: '', bursary_type: 'none', custom_percentage: '0', notes: '' }); setBursaryDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-1" />Add Bursary
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Bursary Type</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bursaries.filter(b => b.bursary_type !== 'none').map(b => (
                        <TableRow key={b.id}>
                          <TableCell>{b.students?.full_name || 'Unknown'}</TableCell>
                          <TableCell><Badge>{getBursaryLabel(b.bursary_type, b.custom_percentage)}</Badge></TableCell>
                          <TableCell>{b.notes || '-'}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setBursaryForm({ student_id: b.student_id, bursary_type: b.bursary_type, custom_percentage: String(b.custom_percentage), notes: b.notes || '' });
                              setBursaryDialogOpen(true);
                            }}><Edit className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {bursaries.filter(b => b.bursary_type !== 'none').length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No bursaries configured.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== AUDIT LOG TAB ===== */}
            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Log</CardTitle>
                  <CardDescription>Track all financial changes and modifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Old Value</TableHead>
                        <TableHead>New Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                          <TableCell><Badge variant="outline">{log.action_type.replace(/_/g, ' ')}</Badge></TableCell>
                          <TableCell>{log.students?.full_name || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                          <TableCell>{log.old_value || '-'}</TableCell>
                          <TableCell>{log.new_value || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {auditLogs.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No audit records yet.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* ===== FEE STRUCTURE DIALOG ===== */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFee ? 'Edit' : 'Add'} Fee Structure</DialogTitle>
            <DialogDescription>Define fees for a class and term.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Class</Label>
              <Select value={feeForm.class_name} onValueChange={v => setFeeForm(f => ({ ...f, class_name: v }))}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{uniqueClassNames.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stream (optional)</Label>
              <Select value={feeForm.stream} onValueChange={v => setFeeForm(f => ({ ...f, stream: v }))}>
                <SelectTrigger><SelectValue placeholder="All streams" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Streams</SelectItem>
                  {uniqueStreams.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Academic Year</Label>
                <Select value={feeForm.academic_year} onValueChange={v => setFeeForm(f => ({ ...f, academic_year: v }))}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>{uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term</Label>
                <Select value={feeForm.term} onValueChange={v => setFeeForm(f => ({ ...f, term: v }))}>
                  <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Terms</SelectItem>
                    {uniqueTerms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Billing Type</Label>
              <Select value={feeForm.billing_type} onValueChange={v => setFeeForm(f => ({ ...f, billing_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_term">Per Term</SelectItem>
                  <SelectItem value="per_year">Per Year</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 500000" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={feeForm.description} onChange={e => setFeeForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFee} disabled={saving || !feeForm.class_name || !feeForm.academic_year || !feeForm.amount}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== PAYMENT DIALOG ===== */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a student payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Student</Label>
              <Select value={paymentForm.student_id} onValueChange={v => setPaymentForm(f => ({ ...f, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.student_number})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Academic Year</Label>
                <Select value={paymentForm.academic_year} onValueChange={v => setPaymentForm(f => ({ ...f, academic_year: v }))}>
                  <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>{uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term</Label>
                <Select value={paymentForm.term} onValueChange={v => setPaymentForm(f => ({ ...f, term: v }))}>
                  <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
                  <SelectContent>{uniqueTerms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 350000" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment Date</Label>
                <Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div>
                <Label>Reference Number</Label>
                <Input value={paymentForm.reference_number} onChange={e => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment} disabled={saving || !paymentForm.student_id || !paymentForm.amount || !paymentForm.academic_year}>
              {saving ? 'Saving...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== BURSARY DIALOG ===== */}
      <Dialog open={bursaryDialogOpen} onOpenChange={setBursaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Bursary</DialogTitle>
            <DialogDescription>Set bursary type and percentage for a student.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Student</Label>
              <Select value={bursaryForm.student_id} onValueChange={v => setBursaryForm(f => ({ ...f, student_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.student_number})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bursary Type</Label>
              <Select value={bursaryForm.bursary_type} onValueChange={v => setBursaryForm(f => ({ ...f, bursary_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="full">Full Bursary (100%)</SelectItem>
                  <SelectItem value="half">Half Bursary (50%)</SelectItem>
                  <SelectItem value="custom">Custom Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bursaryForm.bursary_type === 'custom' && (
              <div>
                <Label>Custom Percentage (%)</Label>
                <Input type="number" min="0" max="100" value={bursaryForm.custom_percentage} onChange={e => setBursaryForm(f => ({ ...f, custom_percentage: e.target.value }))} />
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={bursaryForm.notes} onChange={e => setBursaryForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Government scholarship" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBursaryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBursary} disabled={saving || !bursaryForm.student_id}>
              {saving ? 'Saving...' : 'Save Bursary'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/hooks/useSchool';
import { toast } from '@/hooks/use-toast';

export function AddTeacherDialog() {
  const { activeSchool } = useSchool();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [initials, setInitials] = useState('');

  const reset = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setInitials('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSchool) {
      toast({ title: 'No active school', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('create-teacher', {
      body: {
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        initials: initials.trim() || null,
        school_id: activeSchool.id,
      },
    });
    setLoading(false);

    if (error || (data as any)?.error) {
      toast({
        title: 'Failed to create teacher',
        description: (data as any)?.error || error?.message,
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Teacher created', description: `${fullName} can now sign in.` });
    reset();
    setOpen(false);
  };

  if (!activeSchool) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Teacher
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Teacher to {activeSchool.name}</DialogTitle>
          <DialogDescription>
            Create a teacher account. They'll be added to your school automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-name">Full Name</Label>
            <Input id="t-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-email">Email</Label>
            <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-pass">Temporary Password</Label>
            <Input id="t-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="t-init">Initials (optional)</Label>
            <Input id="t-init" value={initials} onChange={(e) => setInitials(e.target.value)} maxLength={6} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Teacher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Shield, ArrowLeft } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle as ADTitle,
  AlertDialogDescription as ADDesc,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const BootstrapSuperAdmin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [meInfo, setMeInfo] = useState<{ email?: string; id?: string } | null>(null);
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user;
      if (u) {
        setMeInfo({ email: u.email || undefined, id: u.id });
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', u.id);
        setMyRoles((roles || []).map((r: any) => r.role));
        if (!email && u.email) setEmail(u.email);
      }
    };
    run();
  }, []);

  const assignSuperAdmin = async () => {
    setLoading(true);
    try {
      // Primary path: invoke edge function
      const { data, error } = await supabase.functions.invoke('bootstrap-super-admin', {
        body: { targetEmail: email },
      });
      if (error) throw error;
      toast({ title: 'Role assigned', description: `super_admin granted to ${email}` });
      setHint(null);
      return;
    } catch (invokeErr: any) {
      // Provide actionable guidance based on common invoke failures
      const msg: string = invokeErr?.message || '';
      const status = (invokeErr?.status ?? invokeErr?.statusCode ?? invokeErr?.code) as number | string | undefined;
      if (status === 404 || /Function not found/i.test(msg)) {
        setHint('Edge function not deployed. In Lovable Cloud: 1) Install Supabase CLI locally, 2) Run `supabase functions deploy bootstrap-super-admin`, 3) Set secrets: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role> SUPABASE_URL=<project_url>`, 4) Retry this action.');
      } else if (/service role|invalid api key|missing key/i.test(msg)) {
        setHint('Missing or invalid SUPABASE_SERVICE_ROLE_KEY for the edge function. Set it with `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role>` and ensure `SUPABASE_URL` is also set.');
      }
      // Fallback path: client-side upsert for self-bootstrap (no edge function)
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
          toast({ title: 'Not authenticated', description: 'Please sign in and try again.', variant: 'destructive' });
          return;
        }
        const me = userData.user;
        const isSelf = (me.email || '').toLowerCase() === email.toLowerCase();
        const { data: myRolesData } = await supabase.from('user_roles').select('role').eq('user_id', me.id);
        const isAdmin = (myRolesData || []).some((r: any) => ['admin', 'super_admin', 'moderator'].includes(r.role));
        if (!isSelf && !isAdmin) {
          toast({ title: 'Forbidden', description: 'You can only self-bootstrap or must already be an admin.', variant: 'destructive' });
          return;
        }
        if (isSelf) {
          const { error: upErr } = await supabase
            .from('user_roles')
            .upsert({ user_id: me.id, role: 'super_admin', assigned_by: me.id, assigned_at: new Date().toISOString() }, { onConflict: 'user_id,role' });
          if (upErr) {
            const upMsg = upErr?.message || '';
            if (/violates row level security|RLS/i.test(upMsg)) {
              setHint('RLS blocked self-bootstrap. Use the edge function setup above. If you have Supabase Dashboard access, you can temporarily add a one-time INSERT policy allowing self-assignment only when no super_admin exists.');
            }
            throw upErr;
          }
          toast({ title: 'Role assigned (fallback)', description: `super_admin granted to ${email}` });
          setHint(null);
          return;
        }
        toast({
          title: 'Edge function required',
          description:
            'To assign roles to other users, deploy the edge function and set SUPABASE_SERVICE_ROLE_KEY. For now, ask the target user to log in and use self-bootstrap.',
          variant: 'destructive',
        });
      } catch (fallbackErr: any) {
        toast({ title: 'Error assigning role', description: fallbackErr?.message || 'Unknown error during fallback', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const selfAssign = async () => {
    if (!meInfo?.email) {
      toast({ title: 'Not authenticated', description: 'Please sign in.', variant: 'destructive' });
      return;
    }
    setEmail(meInfo.email || '');
    await assignSuperAdmin();
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Bootstrap Super Admin
          </CardTitle>
          <CardDescription>
            Assign the <code>super_admin</code> role by email using the edge function or client-side fallback (self-bootstrap only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Alert>
              <AlertTitle>Signed in</AlertTitle>
              <AlertDescription>
                {meInfo?.email ? `You are signed in as ${meInfo.email}.` : 'Not signed in.'}
                {myRoles.length ? ` Current roles: ${myRoles.join(', ')}` : ''}
              </AlertDescription>
            </Alert>

            {hint && (
              <Alert variant="destructive">
                <AlertTitle>Action needed</AlertTitle>
                <AlertDescription>{hint}</AlertDescription>
              </Alert>
            )}

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="default"
                  onClick={() => setConfirmOpen(true)}
                  disabled={loading || myRoles.includes('super_admin')}
                >
                  {myRoles.includes('super_admin') ? 'Already super_admin' : 'Assign super_admin to myself'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <ADTitle>Confirm Self-Assignment</ADTitle>
                  <ADDesc>This grants your account full admin privileges. Continue?</ADDesc>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={selfAssign}>Yes, assign</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
                {meInfo?.email && email.toLowerCase() === (meInfo.email || '').toLowerCase() ? (
                  <p className="text-xs text-muted-foreground mt-1">Target is your account. Current roles: {myRoles.join(', ') || 'none'}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Assigning other users requires the edge function to be deployed.</p>
                )}
              </div>
              <Button onClick={assignSuperAdmin} disabled={loading}>
                {loading ? 'Assigning...' : 'Assign super_admin'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BootstrapSuperAdmin;
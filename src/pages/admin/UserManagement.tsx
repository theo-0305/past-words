import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Search, UserX, UserCheck, Shield, ArrowLeft } from 'lucide-react';

interface UserProfile {
  id: string;
  display_name: string | null;
  account_status: string;
  created_at: string;
  suspension_reason: string | null;
}

export default function UserManagement() {
  const { isAdmin, isLoading, userRole } = useAdminRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionDialog, setActionDialog] = useState<'suspend' | 'activate' | 'role' | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('user');

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    }
  };

  const suspendUser = async () => {
    if (!selectedUser || !suspensionReason.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'suspended',
          suspension_reason: suspensionReason,
          suspended_at: new Date().toISOString(),
          suspended_by: user?.id
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log action
      await supabase.from('admin_audit_log').insert({
        admin_id: user?.id,
        action: 'suspend_user',
        target_type: 'user',
        target_id: selectedUser.id,
        details: { reason: suspensionReason }
      });

      toast({
        title: 'User Suspended',
        description: 'User account has been suspended successfully'
      });

      setActionDialog(null);
      setSuspensionReason('');
      loadUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      toast({
        title: 'Error',
        description: 'Failed to suspend user',
        variant: 'destructive'
      });
    }
  };

  const activateUser = async () => {
    if (!selectedUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          account_status: 'active',
          suspension_reason: null,
          suspended_at: null,
          suspended_by: null
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      await supabase.from('admin_audit_log').insert({
        admin_id: user?.id,
        action: 'activate_user',
        target_type: 'user',
        target_id: selectedUser.id
      });

      toast({
        title: 'User Activated',
        description: 'User account has been activated successfully'
      });

      setActionDialog(null);
      loadUsers();
    } catch (error) {
      console.error('Error activating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate user',
        variant: 'destructive'
      });
    }
  };

  const assignRole = async () => {
    if (!selectedUser) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: selectedUser.id,
          role: selectedRole as any,
          assigned_by: user?.id
        }, {
          onConflict: 'user_id,role'
        });

      if (error) throw error;

      await supabase.from('admin_audit_log').insert({
        admin_id: user?.id,
        action: 'assign_role',
        target_type: 'user',
        target_id: selectedUser.id,
        details: { role: selectedRole }
      });

      toast({
        title: 'Role Assigned',
        description: `User role has been set to ${selectedRole}`
      });

      setActionDialog(null);
      loadUsers();
    } catch (error) {
      console.error('Error assigning role:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign role',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user accounts and permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.display_name || 'Anonymous'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.account_status === 'active' ? 'default' : 'destructive'}>
                      {user.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.account_status === 'active' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedUser(user);
                            setActionDialog('suspend');
                          }}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedUser(user);
                            setActionDialog('activate');
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Activate
                        </Button>
                      )}
                      {userRole === 'super_admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setActionDialog('role');
                          }}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Role
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={actionDialog === 'suspend'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Provide a reason for suspending this user account
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Suspension reason..."
            value={suspensionReason}
            onChange={(e) => setSuspensionReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={suspendUser}>Suspend User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'activate'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to activate this user account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={activateUser}>Activate User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === 'role'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Select a role to assign to this user
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              {userRole === 'super_admin' && (
                <SelectItem value="super_admin">Super Admin</SelectItem>
              )}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={assignRole}>Assign Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

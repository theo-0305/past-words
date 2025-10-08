import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Copy, User, Mail, Shield } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  account_status: string;
  created_at: string;
  roles: string[];
}

export default function UserSearch() {
  const { isAdmin, isLoading } = useAdminRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate]);

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: 'Search Required',
        description: 'Please enter an email or name to search',
        variant: 'destructive'
      });
      return;
    }

    setIsSearching(true);
    try {
      // Search by email (exact match first, then partial)
      let { data: emailData, error: emailError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', `%${searchTerm}%`)
        .limit(20);

      // Search by display name
      let { data: nameData, error: nameError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('display_name', `%${searchTerm}%`)
        .limit(20);

      if (emailError || nameError) {
        throw emailError || nameError;
      }

      // Combine and deduplicate results
      const combinedData = [...(emailData || []), ...(nameData || [])];
      const uniqueUsers = combinedData.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );

      // Get user roles for each user
      const usersWithRoles = await Promise.all(
        uniqueUsers.map(async (user) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);

          return {
            ...user,
            roles: roles?.map(r => r.role) || []
          };
        })
      );

      setSearchResults(usersWithRoles);

      if (usersWithRoles.length === 0) {
        toast({
          title: 'No Results',
          description: 'No users found matching your search criteria',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search users',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const copyUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedUserId(userId);
      toast({
        title: 'User ID Copied',
        description: 'User ID has been copied to clipboard'
      });
      setTimeout(() => setCopiedUserId(null), 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy user ID to clipboard',
        variant: 'destructive'
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">User Search</h1>
          <p className="text-muted-foreground">Find users by email or display name</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <Shield className="mr-2 h-4 w-4" />
          Back to Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
          <CardDescription>
            Enter an email address or display name to find users and their IDs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter email or display name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
                className="w-full"
              />
            </div>
            <Button onClick={searchUsers} disabled={isSearching}>
              <Search className="mr-2 h-4 w-4" />
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          {user.id.substring(0, 8)}...
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUserId(user.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className={`h-3 w-3 ${copiedUserId === user.id ? 'text-green-500' : ''}`} />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {user.display_name || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.account_status === 'active' ? 'default' : 'destructive'}>
                          {user.account_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role} variant={getRoleBadgeVariant(role)}>
                                {role}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">user</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/users?user_id=${user.id}`)}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Manage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {searchResults.length === 0 && !isSearching && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found yet.</p>
              <p className="text-sm mt-2">Use the search above to find users by email or display name.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
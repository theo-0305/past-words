import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, Flag, Shield, BarChart3, Database } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin, isLoading } = useAdminRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalWords: 0,
    pendingContent: 0,
    totalFlags: 0,
    pendingFlags: 0
  });

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadStats();
    }
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      const [usersRes, wordsRes, contentRes, flagsRes] = await Promise.all([
        supabase.from('profiles').select('id, account_status', { count: 'exact' }),
        supabase.from('words').select('id', { count: 'exact' }),
        supabase.from('community_content').select('id, review_status', { count: 'exact' }),
        supabase.from('content_flags').select('id, status', { count: 'exact' })
      ]);

      const activeUsers = usersRes.data?.filter(u => u.account_status === 'active').length || 0;
      const pendingContent = contentRes.data?.filter(c => c.review_status === 'pending').length || 0;
      const pendingFlags = flagsRes.data?.filter(f => f.status === 'pending').length || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        activeUsers,
        totalWords: wordsRes.count || 0,
        pendingContent,
        totalFlags: flagsRes.count || 0,
        pendingFlags
      });
    } catch (error) {
      console.error('Error loading stats:', error);
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
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your LinguaVault platform</p>
        </div>
        <Shield className="h-12 w-12 text-primary" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Words</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWords}</div>
            <p className="text-xs text-muted-foreground">
              Community contributions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingContent}</div>
            <p className="text-xs text-muted-foreground">
              Content awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Flags</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFlags}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingFlags} pending resolution
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="content">Content Moderation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Button onClick={() => navigate('/admin/users')} className="justify-start">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
              <Button onClick={() => navigate('/admin/users/search')} className="justify-start">
                <Search className="mr-2 h-4 w-4" />
                Search Users
              </Button>
              <Button onClick={() => navigate('/admin/content')} className="justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Review Content
              </Button>
              <Button onClick={() => navigate('/admin/flags')} className="justify-start">
                <Flag className="mr-2 h-4 w-4" />
                Handle Flags
              </Button>
              <Button onClick={() => navigate('/admin/analytics')} className="justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
              {/* New bootstrap action */}
              <Button variant="secondary" onClick={() => navigate('/admin/bootstrap')} className="justify-start">
                <Shield className="mr-2 h-4 w-4" />
                Bootstrap Super Admin
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/admin/users')}>
                Go to User Management
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content Moderation</CardTitle>
              <CardDescription>Review and moderate community content</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/admin/content')}>
                Go to Content Moderation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>View platform statistics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/admin/analytics')}>
                Go to Analytics
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

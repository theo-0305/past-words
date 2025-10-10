import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminRole } from '@/hooks/useAdminRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Eye, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CommunityContent {
  id: string;
  title: string;
  content_type: string;
  review_status: string;
  created_at: string;
  user_id: string;
  profiles?: { display_name: string | null };
  // Preview fields
  description?: string | null;
  content_url?: string | null;
  thumbnail_url?: string | null;
  language_id?: string | null;
  languages?: { name: string | null; code: string | null };
  metadata?: any | null;
}

interface ContentFlag {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  community_content?: { title: string };
  profiles?: { display_name: string | null };
}

export default function ContentModeration() {
  const { isAdmin, isLoading } = useAdminRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [content, setContent] = useState<CommunityContent[]>([]);
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [selectedContent, setSelectedContent] = useState<CommunityContent | null>(null);
  const [reviewDialog, setReviewDialog] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadContent();
      loadFlags();
    }
  }, [isAdmin]);

  const loadContent = async () => {
    try {
      const { data, error } = await supabase
        .from('community_content')
        .select(`
          *,
          profiles!community_content_user_id_fkey (display_name),
          languages!community_content_language_id_fkey (name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const loadFlags = async () => {
    try {
      const { data, error } = await supabase
        .from('content_flags')
        .select('*, community_content(title)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFlags(data as any || []);
    } catch (error) {
      console.error('Error loading flags:', error);
    }
  };

  const reviewContent = async (status: 'approved' | 'rejected') => {
    if (!selectedContent) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('community_content')
        .update({
          review_status: status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
        .eq('id', selectedContent.id);

      if (error) throw error;

      await supabase.from('admin_audit_log').insert({
        admin_id: user?.id,
        action: `content_${status}`,
        target_type: 'community_content',
        target_id: selectedContent.id,
        details: { notes: reviewNotes }
      });

      toast({
        title: 'Content Reviewed',
        description: `Content has been ${status}`
      });

      setReviewDialog(null);
      setReviewNotes('');
      loadContent();
    } catch (error) {
      console.error('Error reviewing content:', error);
      toast({
        title: 'Error',
        description: 'Failed to review content',
        variant: 'destructive'
      });
    }
  };

  const resolveFlag = async (flagId: string, status: 'resolved' | 'dismissed') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('content_flags')
        .update({
          status,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', flagId);

      if (error) throw error;

      toast({
        title: 'Flag Updated',
        description: `Flag has been ${status}`
      });

      loadFlags();
    } catch (error) {
      console.error('Error resolving flag:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve flag',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  const pendingContent = content.filter(c => c.review_status === 'pending');
  const pendingFlags = flags.filter(f => f.status === 'pending');

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
          <CardTitle>Content Moderation</CardTitle>
          <CardDescription>Review and moderate community contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">
                Pending Content ({pendingContent.length})
              </TabsTrigger>
              <TabsTrigger value="flags">
                Content Flags ({pendingFlags.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingContent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.content_type}</Badge>
                      </TableCell>
                      <TableCell>{item.profiles?.display_name || 'Anonymous'}</TableCell>
                      <TableCell>
                        <Badge>{item.review_status}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedContent(item);
                              setIsPreviewOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedContent(item);
                              setReviewDialog('approve');
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedContent(item);
                              setReviewDialog('reject');
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingContent.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No pending content to review
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="flags" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingFlags.map((flag) => (
                    <TableRow key={flag.id}>
                      <TableCell className="font-medium">
                        {flag.community_content?.title || 'Deleted'}
                      </TableCell>
                      <TableCell>{flag.reason}</TableCell>
                      <TableCell>{flag.profiles?.display_name || 'Anonymous'}</TableCell>
                      <TableCell>
                        <Badge>{flag.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(flag.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => resolveFlag(flag.id, 'resolved')}
                          >
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveFlag(flag.id, 'dismissed')}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingFlags.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No pending flags to review
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={reviewDialog !== null} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog === 'approve' ? 'Approve' : 'Reject'} Content
            </DialogTitle>
            <DialogDescription>
              Add optional notes about your decision
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Review notes (optional)..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              variant={reviewDialog === 'approve' ? 'default' : 'destructive'}
              onClick={() => reviewContent(reviewDialog === 'approve' ? 'approved' : 'rejected')}
            >
              {reviewDialog === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={() => setIsPreviewOpen(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedContent?.title}</DialogTitle>
            <DialogDescription>{selectedContent?.description || 'No description provided'}</DialogDescription>
          </DialogHeader>

          {(() => {
            const type = selectedContent?.content_type;
            const contentUrl = selectedContent?.content_url || null;
            const thumbnailUrl = selectedContent?.thumbnail_url || null;
            if (type === 'audio') {
              return contentUrl ? (
                <audio controls className="w-full">
                  <source src={contentUrl} />
                </audio>
              ) : null;
            }
            if (type === 'video') {
              return contentUrl ? (
                <video controls className="w-full rounded-md" src={contentUrl} />
              ) : null;
            }
            if (type === 'picture') {
              return (
                <img
                  src={thumbnailUrl || contentUrl || ''}
                  alt={`${selectedContent?.title} preview`}
                  className="w-full max-h-[420px] object-contain rounded-md"
                  loading="lazy"
                />
              );
            }
            if (type === 'article' || type === 'cultural_norm') {
              return (
                <div className="space-y-2">
                  {selectedContent?.description && (
                    <p className="text-sm">{selectedContent.description}</p>
                  )}
                  {contentUrl && (
                    <a
                      href={contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-primary"
                    >
                      Open resource
                    </a>
                  )}
                </div>
              );
            }
            return null;
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mt-4">
            <div>Author: {selectedContent?.profiles?.display_name || 'Anonymous'}</div>
            <div>Language: {selectedContent?.languages?.name || selectedContent?.language_id || '—'}</div>
            <div>Submitted: {selectedContent ? new Date(selectedContent.created_at).toLocaleString() : ''}</div>
          </div>

          {selectedContent?.metadata && (
            <div className="mt-4">
              <div className="font-medium mb-1">Metadata</div>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(selectedContent.metadata, null, 2)}
              </pre>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewDialog !== null} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog === 'approve' ? 'Approve' : 'Reject'} Content
            </DialogTitle>
            <DialogDescription>
              Add optional notes about your decision
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Review notes (optional)..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              variant={reviewDialog === 'approve' ? 'default' : 'destructive'}
              onClick={() => reviewContent(reviewDialog === 'approve' ? 'approved' : 'rejected')}
            >
              {reviewDialog === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit, Trash2, Plus, Eye, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import type { Json } from "@/integrations/supabase/types";

const ITEMS_PER_PAGE = 10;

interface CommunityContent {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  language_id: string | null;
  languages?: { name: string; code: string } | null;
  metadata?: Json | null;
}

const MyContent: React.FC = () => {
  const [content, setContent] = useState<CommunityContent[]>([]);
  const [filteredContent, setFilteredContent] = useState<CommunityContent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteContentId, setDeleteContentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchMyContent();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = content.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredContent(filtered);
    } else {
      setFilteredContent(content);
    }
    setCurrentPage(1);
  }, [searchQuery, content]);

  useEffect(() => {
    console.log('[MyContent] deleteContentId changed:', deleteContentId);
  }, [deleteContentId]);

  const fetchMyContent = async () => {
    console.log('[MyContent] fetchMyContent: start');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[MyContent] Current user:', user ? { id: user.id, email: user.email } : null);
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to view your content",
          variant: "destructive",
        });
        console.warn('[MyContent] No authenticated user; aborting content fetch');
        setLoading(false);
        return;
      }

      // Fetch community content
      console.log('[MyContent] Querying community_content for user_id', user.id);
      const { data: communityData, error: communityError } = await supabase
        .from("community_content")
        .select(`
          id, user_id, title, description, is_public, created_at, language_id,
          languages!community_content_language_id_fkey (name, code)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (communityError) throw communityError;

      // Fetch user's words
      console.log('[MyContent] Querying words for user_id', user.id);
      const { data: wordsData, error: wordsError } = await supabase
        .from("words")
        .select(`
          id, user_id, native_word, translation, is_public, created_at, language_id,
          languages!words_language_id_fkey (name, code)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (wordsError) throw wordsError;

      // Transform words data to match CommunityContent interface
      const transformedWords = (wordsData || []).map(word => ({
        id: `word_${word.id}`, // Prefix to avoid ID conflicts
        user_id: word.user_id,
        title: word.native_word,
        description: word.translation,
        is_public: word.is_public,
        created_at: word.created_at,
        language_id: word.language_id,
        languages: word.languages,
        metadata: { content_type: 'word' } as Json,
      }));

      // Combine both datasets
      const allContent = [...(communityData || []), ...transformedWords];
      
      const rows = allContent.filter((r: any) => {
        const ok = !!r?.id;
        if (!ok) console.warn('[MyContent] Dropping row without id:', r);
        return ok;
      });
      console.log('[MyContent] Fetch results:', { count: rows.length, sample: rows[0] });
      setContent(rows);
      setFilteredContent(rows);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch content";
      console.error('[MyContent] Error fetching content:', error);
      toast({
        title: "Error fetching content",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('[MyContent] fetchMyContent: end');
    }
  };

  const handleDelete = async () => {
    if (!deleteContentId) {
      console.warn('[MyContent] handleDelete called with null id');
      return;
    }

    console.log('[MyContent] handleDelete: start for id', deleteContentId);
    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[MyContent] handleDelete: current user', user ? { id: user.id } : null);
      if (!user) {
        toast({ title: 'Authentication required', description: 'Please log in', variant: 'destructive' });
        throw new Error('No authenticated user');
      }

      console.log('[MyContent] Deleting community_content id', deleteContentId);
      const { data: deleted, error } = await supabase
        .from("community_content")
        .delete()
        .eq("id", deleteContentId)
        .select('id');

      if (error) {
        console.error('[MyContent] Supabase delete error:', error);
        throw error;
      }

      if (!deleted || deleted.length === 0) {
        console.warn('[MyContent] Delete completed but no rows reported as deleted');
        toast({ title: 'Delete did not remove any rows', description: 'No matching content found or permission denied.', variant: 'destructive' });
      } else {
        console.log('[MyContent] Deleted rows count:', deleted.length);
        toast({
          title: "Content deleted",
          description: "Your content has been successfully removed.",
        });
      }

      console.log('[MyContent] handleDelete: fetchMyContent after delete');
      await fetchMyContent();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete content";
      console.error('[MyContent] Error deleting content:', error);
      toast({
        title: "Error deleting content",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteContentId(null);
      console.log('[MyContent] handleDelete: end');
    }
  };

  const totalPages = Math.ceil((searchQuery ? filteredContent.length : content.length) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentContent = (searchQuery ? filteredContent : content).slice(startIndex, startIndex + ITEMS_PER_PAGE);

  console.log('[MyContent] Paging info:', { currentPage, totalPages });
  console.log('[MyContent] Array counts:', {
    contentCount: content.length,
    filteredCount: filteredContent.length,
    currentCount: currentContent.length,
  });

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Content</h1>
          <Button onClick={() => navigate("/add-content")}>
            <Plus className="mr-2 h-4 w-4" /> Add Content
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your content..."
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading your content...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentContent.map((item) => (
                <Card key={item.id} className="p-4">
                  {console.log('[MyContent] Rendering item:', { id: (item as any)?.id, title: item.title, keys: Object.keys(item || {}) })}
                  {console.log('[MyContent] Rendering item JSON:', JSON.stringify(item))}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{item.title}</h2>
                      <p className="text-sm text-muted-foreground">{item.description || "No description"}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        {item.metadata && (item.metadata as any).content_type && (
                          <>
                            <span>•</span>
                            <Badge variant="outline">{(item.metadata as any).content_type}</Badge>
                          </>
                        )}
                        {item.languages && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary">{item.languages.name}</Badge>
                            <span className="text-xs">({item.languages.code})</span>
                          </>
                        )}
                        {item.user_id && (
                          <>
                            <span>•</span>
                            <User className="h-4 w-4" />
                            <span className="text-xs">You</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/content/${item.id}`)}
                        title="View content"
                      >
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/edit-content/${item.id}`)}
                        title="Edit content"
                      >
                        <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const contentId = (item as any)?.id ?? (item as any)?.content_id ?? (item as any)?.community_content_id ?? null;
                          console.log('[MyContent] Delete button clicked. Derived id:', contentId, 'raw item.id:', (item as any)?.id, 'keys:', Object.keys(item || {}));
                          if (!contentId) {
                            console.warn('[MyContent] Missing content id on delete click. Item:', item);
                            toast({ title: 'Cannot delete', description: 'This item has no ID. Please refresh and try again.', variant: 'destructive' });
                            return;
                          }
                          try {
                            console.log('[MyContent] Before setDeleteContentId, current:', deleteContentId);
                            setDeleteContentId(contentId);
                            console.log('[MyContent] After setDeleteContentId (queued), new:', contentId);
                          } catch (e) {
                            console.error('[MyContent] Error setting deleteContentId:', e);
                          }
                        }}
                        title={(item as any)?.id || (item as any)?.content_id || (item as any)?.community_content_id ? "Delete content" : "Cannot delete: missing ID"}
                        disabled={deleting || !((item as any)?.id || (item as any)?.content_id || (item as any)?.community_content_id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ←
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      onClick={() => setCurrentPage(pageNum)}
                      className={currentPage === pageNum ? "bg-primary text-primary-foreground" : ""}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  →
                </Button>
              </div>
            )}
          </>
        )}

        <AlertDialog
          open={!!deleteContentId}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Content</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this content? This action cannot be undone and will remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} onClick={() => setDeleteContentId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground" disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default MyContent;
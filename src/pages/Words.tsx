import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit, Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
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

interface Word {
  id: string;
  native_word: string;
  translation: string;
  category_id: string | null;
  categories: {
    name: string;
  } | null;
}

const ITEMS_PER_PAGE = 10;

const Words = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteWordId, setDeleteWordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchWords();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = words.filter(
        (word) =>
          word.native_word.toLowerCase().includes(searchQuery.toLowerCase()) ||
          word.translation.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredWords(filtered);
    } else {
      setFilteredWords(words);
    }
    setCurrentPage(1);
  }, [searchQuery, words]);

  const fetchWords = async () => {
    try {
      const { data, error } = await supabase
        .from("words")
        .select(`
          id,
          native_word,
          translation,
          category_id,
          categories!words_category_id_fkey (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWords(data || []);
      setFilteredWords(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching words",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteWordId) return;

    try {
      const { error } = await supabase.from("words").delete().eq("id", deleteWordId);

      if (error) throw error;

      toast({
        title: "Word deleted",
        description: "The word has been successfully removed.",
      });

      fetchWords();
    } catch (error: any) {
      toast({
        title: "Error deleting word",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteWordId(null);
    }
  };

  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentWords = filteredWords.slice(startIndex, endIndex);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-2">My Words</h2>
            <p className="text-muted-foreground">Manage your vocabulary collection</p>
          </div>
          <Button
            onClick={() => navigate("/add-word")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Word
          </Button>
        </div>

        <Card className="mb-6 p-4 bg-card border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Filter words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
        </Card>

        {loading ? (
          <Card className="p-8 bg-card border-border">
            <p className="text-center text-muted-foreground">Loading...</p>
          </Card>
        ) : currentWords.length === 0 ? (
          <Card className="p-12 bg-card border-border">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "No words found matching your search." : "No words yet. Start adding words!"}
              </p>
              <Button onClick={() => navigate("/add-word")} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Word
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {currentWords.map((word) => (
                <Card
                  key={word.id}
                  className="p-6 bg-card border-border hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/word/${word.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-foreground mb-1">{word.native_word}</h3>
                      <p className="text-muted-foreground">{word.translation}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/edit-word/${word.id}`);
                        }}
                      >
                        <Edit className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteWordId(word.id);
                        }}
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
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
                  <ChevronLeft className="h-4 w-4" />
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
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        <AlertDialog open={!!deleteWordId} onOpenChange={() => setDeleteWordId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Word</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this word? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Words;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List, Plus, Search, FolderTree, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Word {
  id: string;
  native_word: string;
  translation: string;
  category_id: string | null;
  created_at: string;
  categories: {
    name: string;
  } | null;
}

const Dashboard = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      let query = supabase.from("words");

      if (session) {
        query = query
          .select(`
            id,
            native_word,
            translation,
            category_id,
            created_at,
            categories!words_category_id_fkey (
              name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(5);
      } else {
        // Anonymous users: restrict to public words and avoid category embed to satisfy RLS
        query = query
          .select("id,native_word,translation,created_at")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(5);
      }

      const { data, error } = await query;
      if (error) throw error;

      setWords(data || []);

      // Total count depends on auth (public-only for anon)
      let countQuery = supabase
        .from("words")
        .select("*", { count: "exact", head: true });
      if (!session) {
        countQuery = countQuery.eq("is_public", true);
      }
      const { count, error: countErr } = await countQuery;
      if (countErr) throw countErr;

      setTotalWords(count || 0);
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-foreground mb-2">
            Welcome back!
          </h2>
          <p className="text-muted-foreground">Continue preserving endangered languages</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="p-6 bg-card border-border">
            <p className="text-muted-foreground mb-2">Total Words</p>
            <p className="text-5xl font-bold text-primary">{totalWords}</p>
          </Card>

          <Card className="p-6 bg-card border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search your words..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <Button
            onClick={() => navigate("/words")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <List className="mr-2 h-5 w-5" />
            Word List
          </Button>
          <Button
            onClick={() => navigate("/add-content")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Content
          </Button>
          <Button
            onClick={() => navigate("/categories")}
            variant="secondary"
            className="bg-secondary hover:bg-secondary/80"
          >
            <FolderTree className="mr-2 h-5 w-5" />
            Categories
          </Button>
          <Button
            onClick={() => navigate("/practice")}
            variant="secondary"
            className="bg-secondary hover:bg-secondary/80"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Practice
          </Button>
        </div>

        <Card className="bg-card border-border">
          <div className="p-6">
            <h3 className="text-2xl font-bold text-foreground mb-6">Recently Added</h3>
            
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : words.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No words yet. Start building your vocabulary!</p>
                <Button onClick={() => navigate("/add-word")} className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Word
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-foreground font-semibold">Word</th>
                      <th className="text-left py-3 px-4 text-foreground font-semibold">Category</th>
                      <th className="text-left py-3 px-4 text-foreground font-semibold">Date Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {words.map((word) => (
                      <tr
                        key={word.id}
                        className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/word/${word.id}`)}
                      >
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-semibold text-foreground">{word.native_word}</p>
                            <p className="text-sm text-muted-foreground">{word.translation}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {word.categories?.name && (
                            <span className="inline-block px-3 py-1 rounded-full text-sm bg-primary/20 text-primary">
                              {word.categories.name}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">
                          {new Date(word.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;

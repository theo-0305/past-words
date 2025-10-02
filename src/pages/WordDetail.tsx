import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
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
  notes: string | null;
  created_at: string;
  categories: {
    name: string;
  } | null;
}

const WordDetail = () => {
  const { id } = useParams();
  const [word, setWord] = useState<Word | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchWord();
    }
  }, [id]);

  const fetchWord = async () => {
    try {
      const { data, error } = await supabase
        .from("words")
        .select(`
          id,
          native_word,
          translation,
          notes,
          created_at,
          categories (
            name
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Word not found",
          description: "The word you're looking for doesn't exist.",
          variant: "destructive",
        });
        navigate("/words");
        return;
      }

      setWord(data);
    } catch (error: any) {
      toast({
        title: "Error fetching word",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("words").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Word deleted",
        description: "The word has been successfully removed.",
      });

      navigate("/words");
    } catch (error: any) {
      toast({
        title: "Error deleting word",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="p-8 bg-card border-border">
            <p className="text-center text-muted-foreground">Loading...</p>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!word) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/words")}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Words
        </Button>

        <Card className="p-8 bg-card border-border">
          <div className="mb-8">
            <h2 className="text-5xl font-bold text-foreground mb-3">{word.native_word}</h2>
            <p className="text-2xl text-muted-foreground">{word.translation}</p>
          </div>

          {word.categories?.name && (
            <div className="mb-8">
              <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-primary/20 text-primary">
                {word.categories.name}
              </span>
            </div>
          )}

          {word.notes && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-foreground mb-3">Notes & Context</h3>
              <p className="text-muted-foreground leading-relaxed">{word.notes}</p>
            </div>
          )}

          <div className="flex gap-4 pt-6 border-t border-border">
            <Button
              onClick={() => navigate(`/edit-word/${word.id}`)}
              variant="secondary"
              className="bg-secondary hover:bg-secondary/80"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </Card>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Word</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{word.native_word}"? This action cannot be undone.
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

export default WordDetail;

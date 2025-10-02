import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Word {
  id: string;
  native_word: string;
  translation: string;
}

const Practice = () => {
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    try {
      const { data, error } = await supabase
        .from("words")
        .select("id, native_word, translation")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Shuffle the words for practice
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      setWords(shuffled);
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

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowTranslation(false);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setShowTranslation(false);
    fetchWords();
  };

  const currentWord = words[currentIndex];
  const isLastWord = currentIndex === words.length - 1;

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="mb-8">
          <h2 className="text-4xl font-bold text-foreground mb-2">Practice Mode</h2>
          <p className="text-muted-foreground">Test your knowledge of the vocabulary</p>
        </div>

        {words.length === 0 ? (
          <Card className="p-12 bg-card border-border">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">No words to practice. Add some words first!</p>
              <Button onClick={() => navigate("/add-word")} className="bg-primary hover:bg-primary/90">
                Add Words
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <Card className="p-12 bg-card border-border mb-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Word {currentIndex + 1} of {words.length}
                </p>
                <h3 className="text-5xl font-bold text-foreground mb-8">
                  {currentWord.native_word}
                </h3>

                {showTranslation ? (
                  <p className="text-3xl text-primary mb-8">{currentWord.translation}</p>
                ) : (
                  <Button
                    onClick={() => setShowTranslation(true)}
                    className="mb-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Show Translation
                  </Button>
                )}

                <div className="flex gap-4 justify-center">
                  {!isLastWord ? (
                    <Button
                      onClick={handleNext}
                      disabled={!showTranslation}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Next Word
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRestart}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Restart Practice
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <div className="flex justify-center">
              <div className="flex gap-2">
                {words.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full ${
                      index === currentIndex
                        ? "bg-primary"
                        : index < currentIndex
                        ? "bg-primary/50"
                        : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Practice;

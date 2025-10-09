import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft, Globe, BookOpen, Users, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const LanguageDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [languageInfo, setLanguageInfo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [languageName, setLanguageName] = useState(
    location.state?.languageName || ""
  );
  const [languageCode, setLanguageCode] = useState(
    location.state?.languageCode || ""
  );
  const [practiceVocab, setPracticeVocab] = useState<Array<{ native: string; translation: string }>>([]);
  const [isPracticeLoading, setIsPracticeLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchLanguageInfo();
  }, [id]);

  const fetchLanguageInfo = async () => {
    try {
      setIsLoading(true);

      // If we don't have language name from state, fetch it
      if (!languageName && id) {
        const { data, error } = await supabase
          .from("languages")
          .select("name, code")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (data) {
          setLanguageName(data.name);
          setLanguageCode(data.code);
        }
      }

      // Fetch language information from AI
      const { data, error } = await supabase.functions.invoke("language-info", {
        body: {
          languageName: languageName || location.state?.languageName,
          languageCode: languageCode || location.state?.languageCode,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setLanguageInfo(data.languageInfo);

      // Fetch practice vocabulary from web via edge function
      setIsPracticeLoading(true);
      try {
        const { data: practiceData, error: practiceError } = await supabase.functions.invoke("language-practice", {
          body: {
            languageName: languageName || location.state?.languageName,
            languageCode: languageCode || location.state?.languageCode,
          },
        });
        if (practiceError) throw practiceError;
        if (practiceData?.practice?.vocabulary) {
          const raw = practiceData.practice.vocabulary as Array<{ native: string; translation: string }>;
          const filtered = raw.filter(p => p.native && p.translation && p.native.trim().toLowerCase() !== p.translation.trim().toLowerCase());
          console.log('[LanguageDetail] practice vocab counts', { raw: raw.length, filtered: filtered.length });
          setPracticeVocab(filtered);
        }
      } catch (e) {
        console.error("Practice fetch error:", e);
      } finally {
        setIsPracticeLoading(false);
      }
    } catch (error) {
      console.error("Error fetching language info:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load language information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Languages
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {languageName || "Language Detail"}
            </h1>
            <p className="text-muted-foreground">
              Explore and learn about {languageName || "this language"}
            </p>
          </div>
          <Globe className="h-10 w-10 text-primary" />
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading language information...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {!isLoading && languageInfo && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="p-8">
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-3xl font-bold mb-4 text-primary" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-2xl font-bold mt-8 mb-4 text-primary" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-xl font-semibold mt-6 mb-3" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc pl-6 space-y-2 my-4" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal pl-6 space-y-2 my-4" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-4 leading-relaxed" {...props} />
                      ),
                    }}
                  >
                    {languageInfo}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Practice Section */}
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Practice</h2>
                </div>
                {isPracticeLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Fetching practice vocabulary from the web...</span>
                  </div>
                ) : practiceVocab.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {practiceVocab.map((item, idx) => (
                      <Card key={idx} className="p-4 bg-card border-border">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">{item.native}</span>
                          <span className="text-muted-foreground">{item.translation}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No practice vocabulary found yet.</p>
                )}
                <div className="mt-6 flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      navigate("/practice", {
                        state: {
                          languageName,
                          practiceVocab,
                        },
                      })
                    }
                  >
                    Open Practice Mode
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Action Cards */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/words")}>
                <CardContent className="p-6 text-center">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold mb-1">Learn Words</h3>
                  <p className="text-sm text-muted-foreground">
                    Explore vocabulary
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/practice", { state: { languageName, practiceVocab } })}>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold mb-1">Practice</h3>
                  <p className="text-sm text-muted-foreground">
                    Test your knowledge
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/community")}>
                <CardContent className="p-6 text-center">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold mb-1">Community</h3>
                  <p className="text-sm text-muted-foreground">
                    Join the effort
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageDetail;
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/languages")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Languages
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Globe className="h-12 w-12 text-primary" />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {languageName}
              </h1>
              {languageCode && (
                <p className="text-muted-foreground font-mono mt-1">
                  Language Code: {languageCode}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                Gathering information about {languageName}...
              </p>
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

              <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/practice")}>
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
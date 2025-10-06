import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Language {
  id: string;
  name: string;
  code: string;
}

const Languages = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchLanguages();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLanguages(languages);
    } else {
      const filtered = languages.filter(lang =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLanguages(filtered);
    }
  }, [searchQuery, languages]);

  const fetchLanguages = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("languages")
        .select("*")
        .order("name");

      if (error) throw error;

      setLanguages(data || []);
      setFilteredLanguages(data || []);
    } catch (error) {
      console.error("Error fetching languages:", error);
      toast({
        title: "Error",
        description: "Failed to load languages",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageClick = (language: Language) => {
    navigate(`/language/${language.id}`, { 
      state: { languageName: language.name, languageCode: language.code } 
    });
  };

  // Endangered language codes (subset for highlighting)
  const endangeredCodes = ['shy', 'ain', 'gwi', 'cor', 'gla', 'haw', 'nav', 'mao', 'que', 'eus', 'cym', 'bre', 'smi', 'iro'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Explore Endangered Languages
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Discover the rich history, culture, and current preservation efforts of endangered languages from around the world.
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        )}

        {/* Languages Grid */}
        {!isLoading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLanguages.map((language) => {
              const isEndangered = endangeredCodes.includes(language.code);
              return (
                <Card
                  key={language.id}
                  className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                  onClick={() => handleLanguageClick(language)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Globe className={`h-8 w-8 ${isEndangered ? 'text-orange-600' : 'text-primary'}`} />
                      {isEndangered && (
                        <Badge variant="outline" className="border-orange-600 text-orange-600">
                          Endangered
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                      {language.name}
                    </CardTitle>
                    <CardDescription className="text-sm font-mono">
                      {language.code}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="ghost"
                      className="w-full justify-between group-hover:bg-primary/10"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Learn More
                      </span>
                      <span>→</span>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredLanguages.length === 0 && (
          <div className="text-center py-20">
            <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No languages found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? `No results for "${searchQuery}"` : "No languages available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Languages;
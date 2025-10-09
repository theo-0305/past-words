import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EndangeredMeta {
  status?: string;
  region?: string;
  featured?: boolean;
}

interface Language {
  id: string;
  name: string;
  code: string;
  endangered_languages?: EndangeredMeta[];
}

const Languages = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [filteredLanguages, setFilteredLanguages] = useState<Language[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // ISO 639-3 codes for endangered African languages we inserted
  const endangeredCodes = ['kcy', 'tia', 'bga', 'tyu', 'nmn', 'yey', 'shg', 'aku'];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'critically_endangered':
        return 'border-red-600 text-red-600';
      case 'severely_endangered':
        return 'border-orange-600 text-orange-600';
      case 'definitely_endangered':
        return 'border-yellow-600 text-yellow-700';
      case 'vulnerable':
        return 'border-amber-500 text-amber-600';
      case 'extinct':
        return 'border-gray-600 text-gray-700';
      default:
        return 'border-primary text-primary';
    }
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  useEffect(() => {
    const endangeredOnly = languages.filter(
      (lang) => lang.endangered_languages && lang.endangered_languages.length > 0
    );
    console.info("Languages total:", languages.length, "Endangered-only:", endangeredOnly.length, "Search:", searchQuery);
  
    if (searchQuery.trim() === "") {
      setFilteredLanguages(endangeredOnly);
      console.info("Filtered languages set (no search):", endangeredOnly.length);
    } else {
      const filtered = endangeredOnly.filter((lang) =>
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLanguages(filtered);
      console.info("Filtered languages set (with search):", filtered.length);
    }
  }, [searchQuery, languages]);

  const fetchLanguages = async () => {
    setIsLoading(true);
    try {
      // Primary: fetch languages with endangered metadata
      const { data, error } = await supabase
        .from("languages")
        .select("id,name,code,endangered_languages!endangered_languages_language_id_fkey(status,region,featured)")
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        // Normalize embedded relation to an array; PostgREST returns object for 1:1 FKs
        const normalized = data.map((row: any) => {
          const meta = row.endangered_languages;
          const metaArray = Array.isArray(meta) ? meta : (meta ? [meta] : []);
          return {
            id: row.id,
            name: row.name ?? row.code ?? "Unknown",
            code: row.code ?? "",
            endangered_languages: metaArray,
          } as Language;
        });
        setLanguages(normalized);
        setFilteredLanguages(normalized);
        return;
      }

      // Fallback: query endangered_languages and join language details
      const { data: elData, error: elError } = await supabase
        .from("endangered_languages")
        .select(
          "status,region,featured,languages!endangered_languages_language_id_fkey(id,name,code)"
        );

      if (elError) throw elError;

      const mapped = (elData || [])
        .filter((row: any) => row.languages)
        .map((row: any) => ({
          id: row.languages.id,
          name: row.languages.name ?? row.languages.code ?? "Unknown",
          code: row.languages.code ?? "",
          endangered_languages: [{
            status: row.status,
            region: row.region,
            featured: row.featured,
          }],
        }));

      setLanguages(mapped);
      setFilteredLanguages(mapped);
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

  // Endangered metadata is now fetched via relation `endangered_languages`

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
              const isEndangered = language.endangered_languages && language.endangered_languages.length > 0;
              const endangeredMeta = language.endangered_languages?.[0];
              return (
                <Card
                  key={language.id}
                  className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                  onClick={() => handleLanguageClick(language)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Globe className={`h-8 w-8 ${isEndangered ? 'text-orange-600' : 'text-primary'}`} />
                      {isEndangered && endangeredMeta?.status && (
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(endangeredMeta.status)}
                        >
                          {endangeredMeta.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                      {language.name}
                    </CardTitle>
                    <CardDescription className="text-sm font-mono">
                      {language.code}
                    </CardDescription>
                    {endangeredMeta?.region && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {endangeredMeta.region}
                      </p>
                    )}
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
            <h3 className="text-xl font-semibold mb-2">No endangered languages found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? `No results for "${searchQuery}"` : "No endangered languages available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Languages;
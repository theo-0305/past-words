import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Globe, Music, Image as ImageIcon, BookOpen, Video, FileText } from "lucide-react";

const contentTypeIcons = {
  audio: Music,
  word: BookOpen,
  picture: ImageIcon,
  cultural_norm: Globe,
  video: Video,
  article: FileText,
};

const Community = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedContentType, setSelectedContentType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch languages
  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("languages")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch public community content
  const { data: communityContent, isLoading } = useQuery({
    queryKey: ["community-content", selectedLanguage, selectedContentType, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("community_content")
        .select(`
          *,
          languages (name, code),
          profiles!community_content_user_id_fkey (display_name)
        `)
        .eq("is_public", true);

      if (selectedLanguage !== "all") {
        query = query.eq("language_id", selectedLanguage);
      }

      if (selectedContentType !== "all") {
        query = query.eq("content_type", selectedContentType as any);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch public words
  const { data: publicWords } = useQuery({
    queryKey: ["public-words", selectedLanguage, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("words")
        .select(`
          *,
          languages (name, code),
          profiles!words_user_id_fkey (display_name)
        `)
        .eq("is_public", true);

      if (selectedLanguage !== "all") {
        query = query.eq("language_id", selectedLanguage);
      }

      if (searchQuery) {
        query = query.or(`native_word.ilike.%${searchQuery}%,translation.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Combine content when showing "all" or "word" type
  const displayContent = selectedContentType === "all" || selectedContentType === "word" 
    ? [...(communityContent || []), ...(publicWords || []).map(w => ({
        ...w,
        content_type: 'word' as const,
        title: w.native_word,
        description: w.translation,
      }))]
    : communityContent || [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Community Library
          </h1>
          <p className="text-muted-foreground">
            Explore public contributions from language preservers worldwide
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {languages?.map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedContentType} onValueChange={setSelectedContentType}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="word">Words</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="picture">Pictures</SelectItem>
              <SelectItem value="cultural_norm">Cultural Norms</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="article">Articles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading community content...</p>
          </div>
        ) : displayContent.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No public content found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayContent.map((item: any) => {
              const Icon = contentTypeIcons[item.content_type as keyof typeof contentTypeIcons] || BookOpen;
              
              return (
                <Card
                  key={item.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  role="button"
                  onClick={() => {
                    setSelectedItem(item);
                    setIsDialogOpen(true);
                  }}
               >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                      <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                    </div>
                    <CardDescription className="line-clamp-2">
                      {item.description || item.notes}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary">
                        {item.languages?.name || "Unknown Language"}
                      </Badge>
                      <Badge variant="outline">
                        {item.content_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    {item.thumbnail_url && item.content_type === 'video' ? (
                      <HoverCard openDelay={200}>
                        <HoverCardTrigger asChild>
                          <img
                            src={item.thumbnail_url}
                            alt={`${item.title} ${item.content_type} thumbnail`}
                            className="w-full h-48 object-cover rounded-md mb-4 cursor-pointer transition-transform hover:scale-[1.02]"
                            loading="lazy"
                          />
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 p-2" side="top">
                          <video
                            src={item.content_url}
                            className="w-full rounded-md"
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        </HoverCardContent>
                      </HoverCard>
                    ) : item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={`${item.title} ${item.content_type} thumbnail`}
                        className="w-full h-48 object-cover rounded-md mb-4"
                        loading="lazy"
                      />
                    ) : null}
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={`${item.title} image`}
                        className="w-full h-48 object-cover rounded-md mb-4"
                        loading="lazy"
                      />
                    )}
                    <p className="text-sm text-muted-foreground">
                      Shared by {item.profiles?.display_name || "Anonymous"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.title}</DialogTitle>
                <DialogDescription>
                  {selectedItem.description || selectedItem.notes}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedItem.languages?.name || 'Unknown Language'}</Badge>
                  <Badge variant="outline">{selectedItem.content_type?.replace('_',' ') || 'word'}</Badge>
                </div>

                {(() => {
                  const type = selectedItem.content_type;
                  const contentUrl = selectedItem.content_url || selectedItem.audio_url || selectedItem.image_url;
                  if (type === 'audio' || (!type && selectedItem.audio_url)) {
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
                  if (type === 'picture' || (!type && selectedItem.image_url)) {
                    return (
                      <img src={selectedItem.image_url || selectedItem.thumbnail_url} alt={`${selectedItem.title} preview`} className="w-full max-h-[420px] object-contain rounded-md" loading="lazy" />
                    );
                  }
                  if (type === 'article' || type === 'cultural_norm') {
                    return selectedItem.content_url ? (
                      <a href={selectedItem.content_url} target="_blank" rel="noopener noreferrer" className="underline text-primary">
                        Open resource
                      </a>
                    ) : null;
                  }
                  if (selectedItem.audio_url) {
                    return (
                      <audio controls className="w-full">
                        <source src={selectedItem.audio_url} />
                      </audio>
                    );
                  }
                  return null;
                })()}

                {!selectedItem.content_type && (
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Native word</span>
                      <p className="font-medium">{selectedItem.native_word}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Translation</span>
                      <p className="font-medium">{selectedItem.translation}</p>
                    </div>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  Shared by {selectedItem.profiles?.display_name || 'Anonymous'}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Community;

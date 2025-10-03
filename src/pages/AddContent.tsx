import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Music, Image as ImageIcon, Globe, Video, FileText, BookOpen } from "lucide-react";

const contentTypes = [
  { value: "word", label: "Words", icon: BookOpen },
  { value: "audio", label: "Audio", icon: Music },
  { value: "picture", label: "Pictures", icon: ImageIcon },
  { value: "cultural_norm", label: "Cultural Norms", icon: Globe },
  { value: "video", label: "Videos", icon: Video },
  { value: "article", label: "Articles", icon: FileText },
];

const AddContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState<string>("word");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [languageId, setLanguageId] = useState("");
  const [isPublic, setIsPublic] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (contentType === "word") {
        // Save to words table
        const { error } = await supabase.from("words").insert({
          user_id: user.id,
          native_word: title,
          translation: description,
          language_id: languageId || null,
          is_public: isPublic,
          image_url: thumbnailUrl || null,
          audio_url: contentUrl || null,
        });

        if (error) throw error;
      } else {
        // Save to community_content table
        const { error } = await supabase.from("community_content").insert([{
          user_id: user.id,
          content_type: contentType as any,
          title,
          description,
          content_url: contentUrl || null,
          thumbnail_url: thumbnailUrl || null,
          language_id: languageId || null,
          is_public: isPublic,
        }]);

        if (error) throw error;
      }

      toast({
        title: "Success!",
        description: `${contentTypes.find(t => t.value === contentType)?.label} content added successfully`,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setContentUrl("");
      setThumbnailUrl("");
      setLanguageId("");
      setIsPublic(false);

      if (isPublic) {
        navigate("/community");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedType = contentTypes.find(t => t.value === contentType);
  const Icon = selectedType?.icon || BookOpen;

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Add Content
          </h1>
          <p className="text-muted-foreground">
            Share your language preservation resources with the community
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {selectedType?.label}
            </CardTitle>
            <CardDescription>
              Fill in the details below to add new content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Content Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="contentType">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger id="contentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => {
                      const TypeIcon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Language Selection */}
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={languageId} onValueChange={setLanguageId}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages?.map((lang) => (
                      <SelectItem key={lang.id} value={lang.id}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  {contentType === "word" ? "Native Word" : "Title"} *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder={contentType === "word" ? "Enter the word in native language" : "Enter title"}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  {contentType === "word" ? "Translation" : "Description"} *
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder={contentType === "word" ? "Enter translation" : "Enter description"}
                  rows={4}
                />
              </div>

              {/* Content URL */}
              {contentType !== "word" && (
                <div className="space-y-2">
                  <Label htmlFor="contentUrl">
                    {contentType === "audio" && "Audio URL"}
                    {contentType === "video" && "Video URL"}
                    {contentType === "picture" && "Image URL"}
                    {contentType === "article" && "Article URL"}
                    {contentType === "cultural_norm" && "Resource URL"}
                  </Label>
                  <Input
                    id="contentUrl"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="Enter URL"
                    type="url"
                  />
                </div>
              )}

              {/* Audio URL for words */}
              {contentType === "word" && (
                <div className="space-y-2">
                  <Label htmlFor="audioUrl">Audio URL (Optional)</Label>
                  <Input
                    id="audioUrl"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="Enter audio URL"
                    type="url"
                  />
                </div>
              )}

              {/* Thumbnail URL */}
              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl">
                  {contentType === "picture" ? "Image URL" : "Thumbnail URL (Optional)"}
                </Label>
                <Input
                  id="thumbnailUrl"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="Enter thumbnail/image URL"
                  type="url"
                />
              </div>

              {/* Public Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic" className="text-base">
                    Make Public
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Share this content with the community
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Adding..." : "Add Content"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AddContent;

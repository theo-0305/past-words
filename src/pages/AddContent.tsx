import { useState, useRef } from "react";
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
import { Music, Image as ImageIcon, Globe, Video, FileText, BookOpen, Upload } from "lucide-react";

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
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  
  const contentFileRef = useRef<HTMLInputElement>(null);
  const thumbnailFileRef = useRef<HTMLInputElement>(null);

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

  const generateVideoThumbnail = async (videoFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.preload = 'metadata';
      video.muted = true;
      
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration / 2);
      };
      
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      };
      
      video.onerror = () => reject(new Error('Failed to load video'));
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const uploadFile = async (file: File, type: 'content' | 'thumbnail') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('community-content')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('community-content')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'content' | 'thumbnail') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'content') {
      setUploadingFile(true);
    } else {
      setUploadingThumbnail(true);
    }

    try {
      const url = await uploadFile(file, type);
      
      if (type === 'content') {
        setContentUrl(url);
        
        // Auto-generate thumbnail for videos
        if (contentType === 'video' && !thumbnailUrl && file.type.startsWith('video/')) {
          try {
            const thumbnailBlob = await generateVideoThumbnail(file);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const thumbnailFileName = `${user.id}/${Date.now()}_thumbnail.jpg`;
              const { data: thumbnailData, error: thumbnailError } = await supabase.storage
                .from('community-content')
                .upload(thumbnailFileName, thumbnailBlob, {
                  cacheControl: '3600',
                  upsert: false
                });
              
              if (!thumbnailError && thumbnailData) {
                const { data: { publicUrl } } = supabase.storage
                  .from('community-content')
                  .getPublicUrl(thumbnailData.path);
                setThumbnailUrl(publicUrl);
                toast({
                  title: "Video uploaded",
                  description: "Video and thumbnail generated successfully",
                });
              } else {
                toast({
                  title: "File uploaded",
                  description: "Video uploaded, but thumbnail generation failed",
                });
              }
            }
          } catch (err) {
            console.error('Thumbnail generation failed:', err);
            toast({
              title: "File uploaded",
              description: "Your file has been uploaded successfully",
            });
          }
        } else {
          toast({
            title: "File uploaded",
            description: "Your file has been uploaded successfully",
          });
        }
      } else {
        setThumbnailUrl(url);
        toast({
          title: "Thumbnail uploaded",
          description: "Your thumbnail has been uploaded successfully",
        });
      }
    } finally {
      if (type === 'content') {
        setUploadingFile(false);
      } else {
        setUploadingThumbnail(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      // Ensure profile exists for FK and attribution
      await supabase.from("profiles").upsert({
        id: user.id,
        display_name: (user.user_metadata as any)?.display_name || (user.email ? user.email.split("@")[0] : null)
      });

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
                    {contentType === "audio" && "Audio File/URL"}
                    {contentType === "video" && "Video File/URL"}
                    {contentType === "picture" && "Image File/URL"}
                    {contentType === "article" && "Article URL"}
                    {contentType === "cultural_norm" && "Resource URL"}
                  </Label>
                  
                  <div className="space-y-3">
                    {/* Upload Button */}
                    {(contentType === "audio" || contentType === "video" || contentType === "picture") && (
                      <>
                        <input
                          ref={contentFileRef}
                          type="file"
                          accept={
                            contentType === "audio" ? "audio/*" :
                            contentType === "video" ? "video/*" :
                            "image/*"
                          }
                          onChange={(e) => handleFileUpload(e, 'content')}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => contentFileRef.current?.click()}
                          disabled={uploadingFile}
                          className="w-full"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {uploadingFile ? "Uploading..." : "Upload File"}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">or</p>
                      </>
                    )}
                    
                    {/* URL Input */}
                    <Input
                      id="contentUrl"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="Enter URL"
                      type="url"
                    />
                  </div>
                </div>
              )}

              {/* Audio URL for words */}
              {contentType === "word" && (
                <div className="space-y-2">
                  <Label htmlFor="audioUrl">Audio File/URL (Optional)</Label>
                  
                  <div className="space-y-3">
                    {/* Upload Button */}
                    <input
                      ref={contentFileRef}
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleFileUpload(e, 'content')}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => contentFileRef.current?.click()}
                      disabled={uploadingFile}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingFile ? "Uploading..." : "Upload Audio"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">or</p>
                    
                    {/* URL Input */}
                    <Input
                      id="audioUrl"
                      value={contentUrl}
                      onChange={(e) => setContentUrl(e.target.value)}
                      placeholder="Enter audio URL"
                      type="url"
                    />
                  </div>
                </div>
              )}

              {/* Thumbnail URL */}
              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl">
                  {contentType === "picture" ? "Thumbnail/Preview (Optional)" : "Thumbnail/Preview Image (Optional)"}
                </Label>
                
                <div className="space-y-3">
                  {/* Upload Button */}
                  <input
                    ref={thumbnailFileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'thumbnail')}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => thumbnailFileRef.current?.click()}
                    disabled={uploadingThumbnail}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadingThumbnail ? "Uploading..." : "Upload Thumbnail"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">or</p>
                  
                  {/* URL Input */}
                  <Input
                    id="thumbnailUrl"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="Enter thumbnail/image URL"
                    type="url"
                  />
                  
                  {/* Preview */}
                  {thumbnailUrl && (
                    <div className="mt-2">
                      <img 
                        src={thumbnailUrl} 
                        alt="Thumbnail preview" 
                        className="w-full h-48 object-cover rounded-md border"
                      />
                    </div>
                  )}
                </div>
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

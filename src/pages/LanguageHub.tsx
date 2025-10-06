import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, MessageSquare, Globe, Info, FileQuestion, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LanguageHub = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: BookOpen,
      title: "Lemmas",
      description: "Discover individual words, their meanings, and how they are used in endangered languages.",
      action: "Browse Lemmas",
      path: "/words",
      color: "text-blue-600"
    },
    {
      icon: MessageSquare,
      title: "Phrases",
      description: "Learn common expressions and useful phrases for everyday conversation.",
      action: "Try Phrases",
      path: "/practice",
      color: "text-pink-600"
    },
    {
      icon: Globe,
      title: "Explore Languages",
      description: "Discover endangered languages from around the world with detailed cultural and historical insights.",
      action: "Browse Languages",
      path: "/languages",
      color: "text-teal-600"
    },
    {
      icon: Info,
      title: "About this Project",
      description: "Learn more about the Language Preservation Project, its goals, and how we are supporting the documentation and teaching of endangered languages.",
      action: "Read More",
      path: "/about",
      color: "text-purple-600"
    }
  ];

  const featuredLanguages = [
    { name: "Shiyeyi", region: "Botswana & Namibia" },
    { name: "Ainu", region: "Japan" },
    { name: "Hawaiian", region: "Hawaii" },
    { name: "Cherokee", region: "North America" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-block rounded-lg bg-gradient-to-r from-primary via-purple-600 to-pink-600 p-8 mb-8 shadow-xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Language Learning Hub
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl">
              Explore endangered languages through interactive lemmas, phrases, and cultural insights powered by AI.
            </p>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              onClick={() => navigate("/languages")}
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Explore Languages
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/words")}
              className="bg-pink-600 text-white border-pink-600 hover:bg-pink-700 shadow-lg"
            >
              Browse Lemmas
            </Button>
          </div>
        </div>

        {/* Featured Languages */}
        <Card className="mb-8 bg-gradient-to-br from-primary/5 to-purple-600/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Featured Endangered Languages
            </CardTitle>
            <CardDescription>
              Explore these languages with AI-powered cultural and historical insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredLanguages.map((lang, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-background rounded-lg hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate("/languages")}
                >
                  <p className="font-semibold text-primary mb-1">{lang.name}</p>
                  <p className="text-sm text-muted-foreground">{lang.region}</p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    Learn More →
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Learning Sections */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`h-8 w-8 ${section.color}`} />
                    <CardTitle className={section.color}>{section.title}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant={section.path ? "default" : "secondary"}
                    onClick={() => section.path && navigate(section.path)}
                    disabled={!section.path}
                    className="w-full"
                  >
                    {section.action} →
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Questionnaire Section */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-600/5">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <FileQuestion className="h-8 w-8 text-primary" />
              <CardTitle>Questionnaire</CardTitle>
            </div>
            <CardDescription className="text-base">
              Support the Language Preservation Project by filling in our preservation questionnaire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              onClick={() => navigate("/community")}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Take Questionnaire →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LanguageHub;

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Globe, Users, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 rounded-lg bg-primary/10">
              <BookOpen className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-6xl font-bold text-foreground">LinguaVault</h1>
          </div>
          
          <p className="text-2xl text-muted-foreground mb-8">
            Preserve endangered languages through digital documentation
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8"
            >
              Get Started
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              variant="outline"
              size="lg"
              className="text-lg px-8"
            >
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <div className="text-center p-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Globe className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Document Languages</h3>
            <p className="text-muted-foreground">
              Create comprehensive digital records of endangered languages with translations and context
            </p>
          </div>

          <div className="text-center p-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Collaborate</h3>
            <p className="text-muted-foreground">
              Work with native speakers and linguists to ensure accurate preservation
            </p>
          </div>

          <div className="text-center p-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Secure Storage</h3>
            <p className="text-muted-foreground">
              Your linguistic data is safely stored and accessible for future generations
            </p>
          </div>
        </div>

        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Join the Mission to Preserve Linguistic Diversity
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Every language carries unique cultural knowledge and perspectives. 
            With technology, we can document and preserve these treasures for future generations.
          </p>
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8"
          >
            Start Preserving Today
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

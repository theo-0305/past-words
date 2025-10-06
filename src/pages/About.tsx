import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          About the Language Preservation Project
        </h1>
        
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          The Language Preservation Project is dedicated to supporting learners, researchers, 
          and the community in exploring and preserving endangered languages. Our aim is to 
          provide accessible resources including vocabulary, phrases, and cultural insights.
        </p>

        <div className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6">Our Goals</h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="text-primary text-xl">•</span>
              <span className="text-lg">Document and teach vocabulary and expressions from endangered languages.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary text-xl">•</span>
              <span className="text-lg">Provide cultural context to support language learning.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary text-xl">•</span>
              <span className="text-lg">Encourage community participation in preserving linguistic heritage.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary text-xl">•</span>
              <span className="text-lg">Offer resources for researchers and educators working with endangered languages.</span>
            </li>
          </ul>
        </div>

        <div className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6">How You Can Help</h2>
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            You can support our mission by filling out our{" "}
            <button
              onClick={() => navigate("/community")}
              className="text-primary underline hover:text-primary/80 font-medium"
            >
              questionnaire
            </button>
            , sharing resources, or participating in community activities that preserve endangered 
            languages and cultures.
          </p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Button
            size="lg"
            onClick={() => navigate("/community")}
          >
            Take Questionnaire
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/")}
          >
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default About;

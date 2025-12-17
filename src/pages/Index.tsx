import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Upload, FileQuestion, Brain, Lightbulb, CheckCircle, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentUpload } from "@/components/DocumentUpload";
import { QuestionsList } from "@/components/QuestionsList";
import { useAuth } from "@/hooks/useAuth";

type View = "home" | "upload" | "questions";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("home");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const features = [
    {
      icon: Upload,
      title: "Upload Documents",
      description: "Upload images or PDFs containing math questions",
    },
    {
      icon: Brain,
      title: "AI-Powered OCR",
      description: "Automatically extract questions using advanced AI",
    },
    {
      icon: CheckCircle,
      title: "Instant Feedback",
      description: "Get immediate evaluation of your answers",
    },
    {
      icon: Lightbulb,
      title: "Smart Hints",
      description: "Receive helpful hints without spoiling the answer",
    },
  ];

  if (currentView === "upload") {
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12">
          {/* Header */}
          <header className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl gradient-hero mb-6 shadow-glow">
              <BookOpen className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Upload Your Document
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Upload an image or PDF containing math questions. Our AI will extract and organize them for you.
            </p>
          </header>

          {/* Upload Component */}
          <DocumentUpload onUploadComplete={() => setCurrentView("questions")} />

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-8">
            <Button variant="ghost" onClick={() => setCurrentView("home")}>
              Back to Home
            </Button>
            <Button variant="outline" onClick={() => setCurrentView("questions")}>
              <FileQuestion className="h-4 w-4" />
              View Questions
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (currentView === "questions") {
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12">
          {/* Header */}
          <header className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl gradient-hero mb-6 shadow-glow">
              <FileQuestion className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Math Questions
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Answer the questions below. Use the hint feature if you get stuck!
            </p>
          </header>

          {/* Questions List */}
          <QuestionsList onBack={() => setCurrentView("upload")} />
        </div>
      </main>
    );
  }

  // Home View
  return (
    <main className="min-h-screen bg-background">
      {/* User Bar */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container max-w-6xl mx-auto px-4 py-16 sm:py-24 relative">
          <div className="text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center justify-center p-4 rounded-3xl gradient-hero shadow-glow mb-4">
              <BookOpen className="h-12 w-12 text-primary-foreground" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              AI Math Teacher
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload your math worksheets, get questions extracted automatically, 
              and receive instant AI-powered feedback on your answers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                variant="hero" 
                size="xl" 
                onClick={() => setCurrentView("upload")}
              >
                <Upload className="h-5 w-5" />
                Upload Document
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => setCurrentView("questions")}
              >
                <FileQuestion className="h-5 w-5" />
                View Questions
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-secondary/30">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A simple, powerful workflow to help you practice math
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:translate-y-[-4px]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-8 sm:p-12 border border-primary/20">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Ready to Practice?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Start by uploading a document with math questions. Our AI will help you every step of the way.
            </p>
            <Button 
              variant="hero" 
              size="lg" 
              onClick={() => setCurrentView("upload")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container max-w-6xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            AI Math Teacher — Built with Lovable
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;

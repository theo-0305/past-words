import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Loader2, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!location.hash) return;
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    const error = params.get("error");
    const error_code = params.get("error_code");
    const error_description = params.get("error_description");
    if (error) {
      toast({
        title: error_code === "otp_expired" ? "Reset link expired" : "Reset error",
        description: error_description || "Please request a new password reset link.",
        variant: "destructive",
      });
      // Clean up the hash to avoid repeated toasts if user refreshes
      history.replaceState(null, "", window.location.pathname);
    }
  }, [location, toast]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const appUrl = import.meta.env.VITE_APP_URL ?? window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${appUrl}/#reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 space-y-6 bg-card border-border">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">LinguaVault</h1>
          </div>

          <div className="text-center space-y-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20 w-16 h-16 mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
            <p className="text-muted-foreground">
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your inbox and follow the instructions to reset your password.
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => navigate("/auth")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                Back to Sign In
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="w-full"
              >
                Resend Email
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-card border-border">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">LinguaVault</h1>
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Forgot Password?</h2>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-secondary border-border"
              placeholder="you@example.com"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>

        <div className="flex items-center justify-between">
          <Link
            to="/auth"
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to Sign In
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Words from "./pages/Words";
import AddWord from "./pages/AddWord";
import EditWord from "./pages/EditWord";
import AddContent from "./pages/AddContent";
import WordDetail from "./pages/WordDetail";
import Categories from "./pages/Categories";
import Practice from "./pages/Practice";
import Community from "./pages/Community";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const HashRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const pathname = location.pathname;

    const hash = location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);

    const error = params.get("error");
    const error_code = params.get("error_code");
    const error_description = params.get("error_description");
    const type = params.get("type");
    const hasAccessToken = params.has("access_token");

    console.log("[HashRedirect] pathname:", pathname);
    console.log("[HashRedirect] hash:", location.hash);
    console.log("[HashRedirect] parsed params:", Object.fromEntries(params.entries()));

    // Handle explicit Supabase error codes first
    if (error) {
      console.warn("[HashRedirect] Error in hash:", { error, error_code, error_description });
      if (pathname !== "/forgot-password") {
        navigate("/forgot-password" + location.hash, { replace: true });
      }
      return;
    }

    // Handle recovery flow (password reset)
    if (hasAccessToken && type === "recovery" && pathname !== "/reset-password") {
      console.log("[HashRedirect] Navigating to /reset-password with hash");
      navigate("/reset-password" + location.hash, { replace: true });
      return;
    }

    // No actionable hash detected
    console.log("[HashRedirect] No redirect needed.");
  }, [location, navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <HashRedirect />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/words" element={<Words />} />
          <Route path="/add-word" element={<AddWord />} />
          <Route path="/add-content" element={<AddContent />} />
          <Route path="/edit-word/:id" element={<EditWord />} />
          <Route path="/word/:id" element={<WordDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/community" element={<Community />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

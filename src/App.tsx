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
    if (location.hash && location.hash.includes('access_token')) {
      navigate('/reset-password' + location.hash, { replace: true });
    }
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

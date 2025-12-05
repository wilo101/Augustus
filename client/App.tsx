import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "@/components/Layout";
import PhoneGPS from "./pages/PhoneGPS";

const queryClient = new QueryClient();

// اجعل الـ basename ديناميكيًا من Vite BASE_URL (بيكون "/Augustus/" في الإنتاج)
const BASENAME = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, ""); // يحذف الـ slash الأخير

import MapPage from "./pages/MapPage";
import DiagnosticsPage from "./pages/DiagnosticsPage";
import SettingsPage from "./pages/SettingsPage";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter basename={BASENAME}>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/diagnostics" element={<DiagnosticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/phone-gps" element={<PhoneGPS />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

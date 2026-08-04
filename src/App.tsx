import '@/core/i18n/setup';
import { Toaster } from "@/core/components/ui/toaster";
import { Toaster as Sonner } from "@/core/components/ui/sonner";
import { TooltipProvider } from "@/core/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { AppRouter } from "./core/routes/app-router";
import { AuthProvider } from "@/features/auth/ui/contexts/auth-provider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRouter />
        </TooltipProvider>
      </LocalizationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

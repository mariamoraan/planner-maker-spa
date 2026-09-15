import '@/core/i18n/setup';
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { AppRouter } from "./core/routes/app-router";
import { AuthProvider } from "@/features/auth/ui/contexts/auth-provider";

const App = () => (
  <AuthProvider>
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <AppRouter />
    </LocalizationProvider>
  </AuthProvider>
);

export default App;

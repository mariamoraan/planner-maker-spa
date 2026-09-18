import '@/core/i18n/setup';
import { AppRouter } from "./core/routes/app-router";
import { AuthProvider } from "@/features/auth/ui/contexts/auth-provider";

const App = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);

export default App;

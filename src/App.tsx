import '@/core/i18n/setup';
import { AppRouter } from "./core/routes/app-router";
import { AuthProvider } from "@/features/auth/ui/contexts/auth-provider";
import { DevToolsPanel } from "@/core/dev-tools";

const App = () => (
  <AuthProvider>
    <AppRouter />
    <DevToolsPanel />
  </AuthProvider>
);

export default App;

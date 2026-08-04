import NotFound from "@/features/landing/ui/pages/NotFound";
import TemplateEditor from "@/features/editor/ui/pages/TemplateEditor";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PATHS } from "./paths";
import LandingPage from "@/features/landing/ui/pages/LandingPage";
import { HomePage } from "@/features/template/ui/pages/home.page";
import { LoginPage } from "@/features/auth/ui/pages/login.page";
import { AccessPendingPage } from "@/features/auth/ui/pages/access-pending.page";
import { ProtectedRoute, AuthRequiredRoute } from "@/features/auth/ui/components/protected-route";

export const AppRouter = () => {
    return (
      <BrowserRouter>
        <Routes>
          <Route path={PATHS.landing} element={<LandingPage />} />
          <Route path={PATHS.login} element={<LoginPage />} />
          <Route
            path={PATHS.accessPending}
            element={
              <AuthRequiredRoute>
                <AccessPendingPage />
              </AuthRequiredRoute>
            }
          />
          <Route
            path={PATHS.home}
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route path="/editor" element={<Navigate to={PATHS.home} replace />} />
          <Route
            path={PATHS.editor}
            element={
              <ProtectedRoute>
                <TemplateEditor />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    )
}

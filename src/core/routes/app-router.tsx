import NotFound from "@/pages/NotFound";
import TemplateEditor from "@/pages/TemplateEditor";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PATHS } from "./paths";
import LandingPage from "@/pages/LandingPage";
import { HomePage } from "@/pages/home.page";
import { LoginPage } from "@/pages/login.page";
import { AccessPendingPage } from "@/pages/access-pending.page";
import { ProtectedRoute, AuthRequiredRoute } from "@/components/auth/protected-route";

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

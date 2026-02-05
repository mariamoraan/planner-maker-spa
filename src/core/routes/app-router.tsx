import NotFound from "@/pages/NotFound";
import TemplateEditor from "@/pages/TemplateEditor";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PATHS } from "./paths";
import LandingPage from "@/pages/LandingPage";


export const AppRouter = () => {
    return (
      <BrowserRouter>
        <Routes>
          <Route path={PATHS.landing} element={<LandingPage />} />
          <Route path={PATHS.editor} element={<TemplateEditor />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    )
}
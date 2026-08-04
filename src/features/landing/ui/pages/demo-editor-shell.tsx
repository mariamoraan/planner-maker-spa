import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import TemplateEditor from '@/features/editor/ui/pages/TemplateEditor';
import { useExportStore } from '@/features/export/ui/stores/export-store';
import { PATHS } from '@/core/routes/paths';
import { openDemoTemplate } from '@/features/landing/use-case/commands/open-demo-template';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';

export function DemoEditorShell() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  const openGenerator = useExportStore(state => state.openGenerator);
  const closeGenerator = useExportStore(state => state.closeGenerator);
  const hasTemplate = useTemplateStore(state =>
    templateId ? state.templates.some(template => template.id === templateId) : false,
  );

  useEffect(() => {
    if (!templateId) {
      navigate(PATHS.landingDemoHome, { replace: true });
      return;
    }

    if (!openDemoTemplate(templateId)) {
      navigate(PATHS.landingDemoHome, { replace: true });
      return;
    }

    setIsReady(true);
  }, [templateId, navigate]);

  useEffect(() => {
    if (searchParams.get('generator') === 'open') {
      openGenerator();
    } else {
      closeGenerator();
    }
  }, [searchParams, openGenerator, closeGenerator]);

  if (!isReady || !hasTemplate) {
    return null;
  }

  return <TemplateEditor />;
}

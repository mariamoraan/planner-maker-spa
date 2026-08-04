import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import TemplateEditor from '@/features/editor/ui/pages/TemplateEditor';
import { useEditorStore } from '@/features/editor/ui/stores/editor-store';
import { useExportStore } from '@/features/export/ui/stores/export-store';
import { DEMO_TEMPLATE } from '@/features/landing/domain/demo-template-data';
import {
  hydrateFromRemote,
  resetSync,
} from '@/features/template/use-case/commands/template.commands';

let demoSeeded = false;

function seedDemoEditor() {
  if (demoSeeded) return;
  resetSync();
  hydrateFromRemote([DEMO_TEMPLATE]);
  useEditorStore.getState().setCurrentImageId('page-monthly');
  demoSeeded = true;
}

seedDemoEditor();

export function DemoEditorShell() {
  const [searchParams] = useSearchParams();
  const openGenerator = useExportStore(state => state.openGenerator);
  const closeGenerator = useExportStore(state => state.closeGenerator);
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current) {
      seedDemoEditor();
      seeded.current = true;
    }

    useEditorStore.getState().setCurrentImageId('page-monthly');

    if (searchParams.get('generator') === 'open') {
      openGenerator();
    } else {
      closeGenerator();
    }
  }, [searchParams, openGenerator, closeGenerator]);

  return <TemplateEditor />;
}

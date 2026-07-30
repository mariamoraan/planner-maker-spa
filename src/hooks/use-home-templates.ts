import { useEffect, useMemo, useState } from 'react';
import { useTemplateStore } from '@/stores/template-store';

export const useHomeTemplates = () => {
  const templates = useTemplateStore(state => state.templates);
  const loadAllTemplateImages = useTemplateStore(state => state.loadAllTemplateImages);
  const [isLoading, setIsLoading] = useState(true);

  const templateIds = useMemo(
    () => templates.map(template => template.id).join(','),
    [templates],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!templateIds) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await loadAllTemplateImages();
      if (!cancelled) {
        setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [templateIds, loadAllTemplateImages]);

  return { templates, isLoading };
};

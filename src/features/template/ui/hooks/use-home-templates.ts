import { useEffect, useMemo } from 'react';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';

export const useHomeTemplates = () => {
  const templates = useTemplateStore(state => state.templates);
  const isSyncReady = useTemplateStore(state => state.isSyncReady);
  const loadAllTemplateImages = useTemplateStore(state => state.loadAllTemplateImages);

  const imageFingerprint = useMemo(
    () =>
      templates
        .map(template => `${template.id}:${template.images.map(img => img.id).join('.')}`)
        .join('|'),
    [templates],
  );

  useEffect(() => {
    if (!isSyncReady || !imageFingerprint) return;

    let cancelled = false;

    const load = async () => {
      try {
        await loadAllTemplateImages();
      } catch (error) {
        if (!cancelled) {
          console.warn('[home-templates] image load failed:', error);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [imageFingerprint, isSyncReady, loadAllTemplateImages]);

  return { templates, isLoading: !isSyncReady };
};

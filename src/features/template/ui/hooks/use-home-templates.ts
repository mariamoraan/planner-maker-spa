import { useEffect, useMemo } from 'react';
import { pageNeedsImageLoad, useTemplateStore } from '@/features/template/ui/stores/template-store';
import { useImageLoadRetry } from '@/features/template/ui/hooks/use-image-load-retry';

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

  const pendingCount = useMemo(
    () =>
      isSyncReady
        ? templates.reduce(
            (total, template) => total + template.images.filter(pageNeedsImageLoad).length,
            0,
          )
        : 0,
    [templates, isSyncReady],
  );

  useImageLoadRetry(pendingCount, loadAllTemplateImages);

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

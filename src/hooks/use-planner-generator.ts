import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import type { Template, GeneratedPage } from '@/types/planner';
import { getFieldValue, loadImage, WeekData, getMonthsBetween } from '@/lib/planner-utils';
import { useTemplateStore } from '@/stores/template-store';
import { WorkerResponse } from '@/workers/pdf.worker';

export function usePlannerGenerator() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { getCurrentTemplate } = useTemplateStore();

  // ─── Generación de páginas ────────────────────────────────────────────────

  const generatePage = async (
    templateImage: Template['images'][0],
    context: {
      year?: number;
      month?: number;
      week?: WeekData;
      days?: Date[];
    }
  ): Promise<{ imageData: string }> => {
    const img = await loadImage(templateImage.src);

    const canvas = document.createElement('canvas');
    canvas.width = templateImage.width;
    canvas.height = templateImage.height;
    const ctx = canvas.getContext('2d')!;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0);

    for (const rect of templateImage.rectangles) {
      const { fieldValue, fieldColor } = getFieldValue({
        fieldType: rect.fieldType,
        context,
        templateImage,
        rectangle: rect,
        fillIncompleteWeeks: true,
        fillIncompleteMonths: true,
      });

      if (fieldValue) {
        const paddingY = rect.height * 0.15;
        const fontSize = rect.height - paddingY * 2;
        const fontName = `"Gloria Hallelujah"`;

        ctx.save();
        await document.fonts.load(`normal ${fontSize}px ${fontName}`);
        ctx.font = `normal ${fontSize}px ${fontName}, system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = fieldColor;
        ctx.fillText(
          fieldValue,
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
          rect.width * 0.9
        );
        ctx.restore();
      }
    }

    return {
      imageData: canvas.toDataURL('image/png'),
    };
  };

  const generatePlanner = useCallback(async (
    template: Template,
    startDate: Date,
    endDate: Date
  ) => {
    setGenerating(true);
    setProgress(0);
    setGeneratedPages([]);

    const pages: GeneratedPage[] = [];
    const months = getMonthsBetween({ startDate, endDate });

    // Cálculo de pasos para la barra de progreso
    let totalSteps = 0;
    const coverImages = template.images.filter(img => img.type === 'cover');
    coverImages.forEach(() => totalSteps++);

    for (const month of months) {
      const monthCover = template.images.find(img => img.type === 'month-cover');
      const monthlyCalendar = template.images.find(img => img.type === 'monthly-calendar');
      const weeklyCalendar = template.images.find(img => img.type === 'weekly-calendar');

      if (monthCover) totalSteps++;
      if (monthlyCalendar) totalSteps++;
      if (weeklyCalendar) totalSteps += month.weeks.length;
    }

    let currentStep = 0;
    const updateProgress = () => {
      currentStep++;
      setProgress((currentStep / totalSteps) * 100);
    };

    try {
      // Portadas
      for (const coverImage of coverImages) {
        const page = await generatePage(coverImage, {});
        pages.push({ ...page, pageNumber: pages.length + 1, type: 'cover' });
        updateProgress();
      }

      // Páginas por mes
      for (const month of months) {
        const monthCovers = template.images.filter(img => img.type === 'month-cover');
        for (const monthCover of monthCovers) {
          const page = await generatePage(monthCover, {
            year: month.year,
            month: month.month,
            days: month.days,
          });
          pages.push({ ...page, pageNumber: pages.length + 1, type: 'month-cover' });
        }
        updateProgress();

        const monthlyCalendars = template.images.filter(img => img.type === 'monthly-calendar');
        for (const monthlyCalendar of monthlyCalendars) {
          const page = await generatePage(monthlyCalendar, {
            year: month.year,
            month: month.month,
            days: month.days,
          });
          pages.push({ ...page, pageNumber: pages.length + 1, type: 'monthly-calendar' });
        }
        updateProgress();

        const weeklyCalendars = template.images.filter(img => img.type === 'weekly-calendar');
        for (const weeklyCalendar of weeklyCalendars) {
          let i = 0;
          for (const week of month.weeks) {
            const page = await generatePage(weeklyCalendar, {
              year: month.year,
              month: month.month,
              week,
            });
            pages.push({
              ...page,
              pageNumber: pages.length + 1,
              type: 'weekly-calendar',
              month: month.month,
              year: month.year,
              weekNumber: i,
            });
            i++;
            updateProgress();
          }
        }
      }

      // Páginas extra
      const extraPages = template.images.filter(img => img.type === 'extra');
      for (const extra of extraPages) {
        const page = await generatePage(extra, {});
        pages.push({ ...page, pageNumber: pages.length + 1, type: 'extra' });
      }

      setGeneratedPages(pages);
    } catch (error) {
      console.error('Error generating planner:', error);
    } finally {
      setGenerating(false);
    }
  }, []);

  // ─── Descarga PDF ─────────────────────────────────────────────────────────

  const downloadPDF = useCallback(async () => {
    if (generatedPages.length === 0) return;
    const currentTemplate = getCurrentTemplate();
    setIsGeneratingPDF(true);
  
    try {
      const worker = new Worker(
        new URL('../workers/pdf.worker.ts', import.meta.url),
        { type: 'module' }
      );
  
      await new Promise<void>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          if (e.data.status === 'success') {
            const blob = new Blob([e.data.pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${currentTemplate?.name ?? 'planner'}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            resolve();
          } else {
            reject(new Error(e.data.message));
          }
          worker.terminate();
        };
  
        worker.onerror = (error) => {
          reject(error);
          worker.terminate();
        };
  
        worker.postMessage({ pages: generatedPages });
      });
  
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [generatedPages, getCurrentTemplate]);

  // ─── Descarga imágenes individuales ──────────────────────────────────────

  const downloadImages = useCallback(() => {
    generatedPages.forEach((page, index) => {
      const link = document.createElement('a');
      link.href = page.imageData;
      link.download = `planner-page-${String(index + 1).padStart(3, '0')}.png`;
      link.click();
    });
  }, [generatedPages]);

  return {
    generating,
    progress,
    generatedPages,
    generatePlanner,
    downloadPDF,
    downloadImages,
    isGeneratingPDF,
  };
}
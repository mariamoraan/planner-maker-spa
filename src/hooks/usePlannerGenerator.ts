import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import type { Template, GeneratedPage } from '@/types/planner';
import { getFieldValue, loadImage, WeekData, getMonthsBetween } from '@/lib/planner-utils';

export function usePlannerGenerator() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);

  
  const generatePlanner = useCallback(async (
    template: Template,
    startDate: Date,
    endDate: Date
  ) => {
    setGenerating(true);
    setProgress(0);
    setGeneratedPages([]);
    
    const pages: GeneratedPage[] = [];
    const months = getMonthsBetween({startDate, endDate});
    
    // Calculate total steps for progress
    let totalSteps = 0;
    const coverImage = template.images.find(img => img.type === 'cover');
    if (coverImage) totalSteps++;
    
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
      // Generate cover page
      if (coverImage) {
        const page = await generatePage(coverImage, {
          year: months[0]?.year,
          month: months[0]?.month,
        });
        pages.push({
          ...page,
          pageNumber: pages.length + 1,
          type: 'cover',
        });
        updateProgress();
      }
      
      // Generate pages for each month
      for (const month of months) {
        // Month cover
        const monthCover = template.images.find(img => img.type === 'month-cover');
        if (monthCover) {
          const page = await generatePage(monthCover, {
            year: month.year,
            month: month.month,
          });
          pages.push({
            ...page,
            pageNumber: pages.length + 1,
            type: 'month-cover',
            month: month.month,
            year: month.year,
          });
          updateProgress();
        }
        
        // Monthly calendar
        const monthlyCalendar = template.images.find(img => img.type === 'monthly-calendar');
        if (monthlyCalendar) {
          const page = await generatePage(monthlyCalendar, {
            year: month.year,
            month: month.month,
          });
          pages.push({
            ...page,
            pageNumber: pages.length + 1,
            type: 'monthly-calendar',
            month: month.month,
            year: month.year,
          });
          updateProgress();
        }
        
        // Weekly calendars
        const weeklyCalendar = template.images.find(img => img.type === 'weekly-calendar');
        console.log('Weekly calendars',month.weeks.length )
        if (weeklyCalendar) {
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
      
      // Extra pages
      const extraPages = template.images.filter(img => img.type === 'extra');
      for (const extra of extraPages) {
        const page = await generatePage(extra, {
          year: months[0]?.year,
        });
        pages.push({
          ...page,
          pageNumber: pages.length + 1,
          type: 'extra',
        });
      }
      
      setGeneratedPages(pages);
    } catch (error) {
      console.error('Error generating planner:', error);
    } finally {
      setGenerating(false);
    }
  }, []);
  
  const generatePage = async (
    templateImage: Template['images'][0],
    context: {
      year?: number;
      month?: number;
      week?: WeekData;
      day?: Date;
    }
  ): Promise<{ imageData: string }> => {
    const img = await loadImage(templateImage.imageData);
    
    const canvas = document.createElement('canvas');
    canvas.width = templateImage.width;
    canvas.height = templateImage.height;
    const ctx = canvas.getContext('2d')!;
    
    // Draw the template image
    ctx.drawImage(img, 0, 0);
    
    // Draw field values
    const dayRectangles = templateImage.rectangles.filter(rect => rect.fieldType === 'day').sort((a, b) => a.order - b.order );
    
    for (const rect of templateImage.rectangles) {
      let value = '';
      
      if (rect.fieldType === 'day' && context.week) {
        // For weekly calendar, assign day numbers to sorted rectangles
        const index = dayRectangles.indexOf(rect);
        if (index >= 0 && index < context.week.days.length) {
          const day = context.week.days[index];
          if (day.getMonth() === context.month) { // Only show if in current month
            value = format(day, 'd');
          }
        }
      } else {
        value = getFieldValue(rect.fieldType, context);
      }
      
      if (value) {
        // Calculate font size based on rectangle height
        const fontSize = Math.min(rect.height * 0.6, rect.width * 0.15);
        
        ctx.save();
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1e293b';
        
        // Draw the text centered in the rectangle
        ctx.fillText(
          value, 
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
  
  const downloadPDF = useCallback(async () => {
    if (generatedPages.length === 0) return;
    
    // Get first page dimensions to set PDF size
    const firstImg = await loadImage(generatedPages[0].imageData);
    const pdfWidth = firstImg.width;
    const pdfHeight = firstImg.height;
    
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfWidth, pdfHeight],
    });
    
    for (let i = 0; i < generatedPages.length; i++) {
      if (i > 0) {
        pdf.addPage([pdfWidth, pdfHeight]);
      }
      
      const pageImg = await loadImage(generatedPages[i].imageData);
      pdf.addImage(pageImg, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }
    
    pdf.save('planner.pdf');
  }, [generatedPages]);
  
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
  };
}

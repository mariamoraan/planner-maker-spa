import React, { useState, useCallback, useLayoutEffect } from 'react';
import { addMonths } from 'date-fns';
import { Calendar, Download, X, FileText, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePlannerGenerator } from '@/hooks/usePlannerGenerator';
import { useTemplateStore } from '@/stores/template-store';

interface GeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GeneratorDialog: React.FC<GeneratorDialogProps> = ({
  open,
  onOpenChange,
}) => {
   const {
      getCurrentTemplate,
      updateTemplate,
    } = useTemplateStore();
  const template = getCurrentTemplate();
  const startDate: Date = template?.startDate ?? new Date();
  const endDate: Date = template?.endDate ?? new Date();
  
  const { generating, progress, generatedPages, generatePlanner, downloadPDF, isGeneratingPDF } = usePlannerGenerator();
 
    
  
  const handleGenerate = useCallback(async () => {
    await generatePlanner(template, startDate, endDate);
  }, [template, startDate, endDate, generatePlanner]);

  useLayoutEffect(() => {
    if(open && generatedPages?.length) {
      handleGenerate()
    }
  }, [open])
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Generate Planner
          </DialogTitle>
          <DialogDescription>
            Select the date range for your planner. The generator will create pages for each month and week.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <input
                type="date"
                value={startDate.toISOString().split("T")[0]} // ✅ Formato YYYY-MM-DD
                onChange={e => {
                  updateTemplate(template.id, {startDate: new Date(e.target.value)})
                }}


              />
            </div>
            
            <div className="space-y-2">
              <Label>End Date</Label>
              <input
                type="date"
                value={endDate.toISOString().split("T")[0]} // ✅ Formato YYYY-MM-DD
                onChange={e => {
                  updateTemplate(template.id, {endDate: new Date(e.target.value)})
                }}
              />
            </div>
          </div>
          
          {/* Template summary */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <h4 className="font-medium text-sm">Template: {template.name}</h4>
            <div className="text-sm text-muted-foreground">
              {template.images.length} template page{template.images.length !== 1 ? 's' : ''} configured
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {template.images.map(img => (
                <div 
                  key={img.id}
                  className="px-2 py-1 rounded text-xs bg-background border"
                >
                  {img.name} ({img.rectangles.length} fields)
                </div>
              ))}
            </div>
          </div>
          
          {/* Progress */}
          {generating && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
                <span className="text-sm">Generating pages...</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}%</p>
            </div>
          )}
          
          {/* Generated pages preview */}
          {generatedPages.length > 0 && !generating && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Generated {generatedPages.length} pages</h4>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {generatedPages.slice(0, 12).map((page, i) => (
                  <div 
                    key={i}
                    className="aspect-[3/4] rounded border bg-muted overflow-hidden"
                  >
                    <img 
                      src={page.imageData} 
                      alt={`Page ${page.pageNumber}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {generatedPages.length > 12 && (
                  <div className="aspect-[3/4] rounded border bg-muted flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">
                      +{generatedPages.length - 12} more
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          {generatedPages.length > 0 && !generating ? (
            <>
              {
                /**
                 <Button variant="outline" onClick={downloadImages}>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Download Images
                  </Button>
                 */
              }

              <Button variant='secondary' onClick={handleGenerate} disabled={generating}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Generate
              </Button>
              <Button onClick={downloadPDF}>
                {isGeneratingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> :  <FileText className="w-4 h-4 mr-2" />}
                Download PDF
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Generate Planner
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

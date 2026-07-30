import React, { useCallback, useLayoutEffect } from 'react';
import { Calendar as CalendarIcon, Download, FileText, Loader2, RotateCcw } from 'lucide-react';
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
import { usePlannerGenerator } from '@/hooks/use-planner-generator';
import { useTemplateStore } from '@/stores/template-store';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useCurrentTemplate } from '@/hooks/use-current-template';
import './planner-generator-dialog.scss';

export const GeneratorDialog: React.FC = () => {
  const { updateTemplate } = useTemplateStore();
  const template = useCurrentTemplate();
  const startDate: Date = template?.startDate ?? new Date();
  const endDate: Date = template?.endDate ?? new Date();

  const isGeneratorOpen = useTemplateStore(state => state.isGeneratorOpen);
  const setIsGeneratorOpen = useTemplateStore(state => state.setIsGeneratorOpen);
  const closeGenerator = useTemplateStore(state => state.closeGenerator);

  const { generating, progress, generatedPages, generatePlanner, downloadPDF, isGeneratingPDF } = usePlannerGenerator();

  const handleGenerate = useCallback(async () => {
    if (!template) return;
    await generatePlanner(template, startDate, endDate);
  }, [template, startDate, endDate, generatePlanner]);

  useLayoutEffect(() => {
    if (isGeneratorOpen && generatedPages?.length) {
      handleGenerate();
    }
  }, [isGeneratorOpen]);

  if (!template) return null;

  return (
    <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
      <DialogContent className="dialog-content--wide">
        <DialogHeader>
          <DialogTitle>
            <span className="dialog-title-row">
              <CalendarIcon className="planner-generator-dialog__icon planner-generator-dialog__icon--title" />
              Generate Planner
            </span>
          </DialogTitle>
          <DialogDescription>
            Select the date range for your planner. The generator will create pages for each month and week.
          </DialogDescription>
        </DialogHeader>

        <div className="planner-generator-dialog__body">
          <div className="planner-generator-dialog__date-grid">
            <div className="planner-generator-dialog__field">
              <Label>Start Date</Label>
              <DatePicker
                views={['month', 'year']}
                value={dayjs(startDate)}
                onChange={(newValue) => {
                  const startDate = new Date(newValue.toISOString());
                  updateTemplate(template.id, { startDate });
                }}
                slotProps={{
                  popper: {
                    disablePortal: true,
                  },
                }}
              />
            </div>

            <div className="planner-generator-dialog__field">
              <Label>End Date</Label>
              <DatePicker
                views={['month', 'year']}
                value={dayjs(endDate)}
                onChange={(newValue) => {
                  const endDate = new Date(newValue.toISOString());
                  updateTemplate(template.id, { endDate });
                }}
                slotProps={{
                  popper: {
                    disablePortal: true,
                  },
                }}
              />
            </div>
          </div>

          <div className="planner-generator-dialog__summary">
            <h4 className="planner-generator-dialog__summary-title">Template: {template.name}</h4>
            <div className="planner-generator-dialog__summary-text">
              {template.images.length} template page{template.images.length !== 1 ? 's' : ''} configured
            </div>
            <div className="planner-generator-dialog__tags">
              {template.images.map(img => (
                <div key={img.id} className="planner-generator-dialog__tag">
                  {img.name} ({img.rectangles.length} fields)
                </div>
              ))}
            </div>
          </div>

          {generating && (
            <div className="planner-generator-dialog__progress">
              <div className="planner-generator-dialog__progress-header">
                <Loader2 className="planner-generator-dialog__icon planner-generator-dialog__icon--spin" />
                <span className="planner-generator-dialog__progress-text">Generating pages...</span>
              </div>
              <div className="planner-generator-dialog__progress-track">
                <div
                  className="planner-generator-dialog__progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="planner-generator-dialog__progress-percent">{Math.round(progress)}%</p>
            </div>
          )}

          {generatedPages.length > 0 && !generating && (
            <div className="planner-generator-dialog__preview">
              <h4 className="planner-generator-dialog__preview-title">
                Generated {generatedPages.length} pages
              </h4>
              <div className="planner-generator-dialog__preview-grid">
                {generatedPages.slice(0, 12).map((page, i) => (
                  <div key={i} className="planner-generator-dialog__preview-item">
                    <img
                      src={page.imageData}
                      alt={`Page ${page.pageNumber}`}
                      className="planner-generator-dialog__preview-image"
                    />
                  </div>
                ))}
                {generatedPages.length > 12 && (
                  <div className="planner-generator-dialog__preview-more">
                    <span className="planner-generator-dialog__preview-more-text">
                      +{generatedPages.length - 12} more
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="dialog-footer--gap">
          {generatedPages.length > 0 && !generating ? (
            <>
              <Button type="button" variant="secondary" onClick={handleGenerate} disabled={generating}>
                <RotateCcw className="planner-generator-dialog__icon planner-generator-dialog__icon--margin-right" />
                Generate
              </Button>
              <Button onClick={downloadPDF}>
                {isGeneratingPDF ? (
                  <Loader2 className="planner-generator-dialog__icon planner-generator-dialog__icon--margin-right planner-generator-dialog__icon--spin" />
                ) : (
                  <FileText className="planner-generator-dialog__icon planner-generator-dialog__icon--margin-right" />
                )}
                Download PDF
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={closeGenerator}>
                Cancel
              </Button>
              <Button type="button" onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="planner-generator-dialog__icon planner-generator-dialog__icon--margin-right planner-generator-dialog__icon--spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="planner-generator-dialog__icon planner-generator-dialog__icon--margin-right" />
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

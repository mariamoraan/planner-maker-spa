import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Download,
  FileDown,
  Hand,
  Home,
  Image as ImageIcon,
  Layers,
  MousePointer2,
  Sparkles,
  Upload,
} from 'lucide-react';
import { FIELD_TYPE_CONFIG } from '@/types/planner';
import './editor-showcase-mockup.scss';

type ShowcasePhase = 'upload' | 'zones' | 'range' | 'generate';

const PHASES: ShowcasePhase[] = ['upload', 'zones', 'range', 'generate'];
const PHASE_MS = 4000;

const phaseIcons: Record<ShowcasePhase, typeof ImageIcon> = {
  upload: ImageIcon,
  zones: Layers,
  range: Calendar,
  generate: Sparkles,
};

function useNarrowViewport(breakpoint = 640) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setNarrow(mq.matches);
    const handler = (event: MediaQueryListEvent) => setNarrow(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return narrow;
}

function StepDotContent({
  step,
  index,
  phaseIndex,
  prefersReducedMotion,
}: {
  step: ShowcasePhase;
  index: number;
  phaseIndex: number;
  prefersReducedMotion: boolean | null;
}) {
  const isActive = index === phaseIndex || (prefersReducedMotion && step === 'generate');
  if (isActive) {
    const StepIcon = phaseIcons[step];
    return <StepIcon size={12} />;
  }
  return <>{index + 1}</>;
}

export function EditorShowcaseMockup() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const isNarrow = useNarrowViewport();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = PHASES[phaseIndex] ?? 'generate';
  const PhaseIcon = phaseIcons[phase];

  useEffect(() => {
    if (prefersReducedMotion) return;

    const timer = window.setInterval(() => {
      setPhaseIndex(current => (current + 1) % PHASES.length);
    }, PHASE_MS);

    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  const activePhase = prefersReducedMotion ? 'generate' : phase;
  const isUploadPhase = activePhase === 'upload';
  const isZonesPhase = activePhase === 'zones';
  const isRangePhase = activePhase === 'range';
  const isGeneratePhase = activePhase === 'generate';

  const monthZoneVisible = isZonesPhase || isRangePhase || isGeneratePhase;
  const dayZoneVisible = isZonesPhase || isRangePhase || isGeneratePhase;
  const zonesConfirmed = isRangePhase || isGeneratePhase;
  const showTypeBadges = isZonesPhase;
  const datesVisible = isGeneratePhase;
  const dialogVisible = isRangePhase;
  const generateHighlighted = isRangePhase;
  const showMobileBar = isNarrow && (isRangePhase || isGeneratePhase);
  const showCursor = isRangePhase && !prefersReducedMotion && !isNarrow;

  const monthConfig = FIELD_TYPE_CONFIG.month;
  const dayConfig = FIELD_TYPE_CONFIG.day;

  const stepTitle = t(`landing.steps.${activePhase}.title`);
  const stepText = t(`landing.steps.${activePhase}.text`);

  return (
    <figure className="editor-showcase" aria-label={t('landing.showcase.a11yLabel')}>
      <div className="editor-showcase__frame">
        <div className="editor-showcase__chrome">
          <span className="editor-showcase__dot editor-showcase__dot--red" />
          <span className="editor-showcase__dot editor-showcase__dot--yellow" />
          <span className="editor-showcase__dot editor-showcase__dot--green" />
          <span className="editor-showcase__url">{t('landing.showcase.url')}</span>
        </div>

        <div className="editor-showcase__app">
          <aside className="editor-showcase__sidebar">
            <div className="editor-showcase__sidebar-header">
              <Home className="editor-showcase__icon" size={14} aria-hidden="true" />
              <span className="editor-showcase__template-name">
                {t('landing.showcase.templateName')}
              </span>
            </div>

            <div className="editor-showcase__sidebar-section">
              <p className="editor-showcase__section-label">{t('editor.dynamicBlocks')}</p>
              <div className="editor-showcase__block-types">
                <span
                  className="editor-showcase__block-type editor-showcase__block-type--month"
                  style={{
                    color: monthConfig.color,
                    backgroundColor: monthConfig.bgColor,
                    borderColor: monthConfig.color,
                  }}
                >
                  <Calendar size={12} aria-hidden="true" />
                  {t('landing.showcase.blockMonth')}
                </span>
                <span
                  className="editor-showcase__block-type editor-showcase__block-type--day"
                  style={{
                    color: dayConfig.color,
                    backgroundColor: dayConfig.bgColor,
                    borderColor: dayConfig.color,
                  }}
                >
                  <Calendar size={12} aria-hidden="true" />
                  {t('landing.showcase.blockDay')}
                </span>
              </div>
            </div>

            <motion.button
              type="button"
              className={`editor-showcase__generate-btn${generateHighlighted ? ' editor-showcase__generate-btn--highlight' : ''}`}
              animate={
                generateHighlighted && !prefersReducedMotion
                  ? {
                      scale: [1, 1.04, 1],
                      boxShadow: [
                        '0 0 0 0 rgba(38, 46, 62, 0)',
                        '0 0 0 4px rgba(38, 46, 62, 0.15)',
                        '0 0 0 0 rgba(38, 46, 62, 0)',
                      ],
                    }
                  : { scale: 1 }
              }
              transition={{ duration: 1.2, repeat: generateHighlighted ? Infinity : 0 }}
            >
              <Sparkles size={14} aria-hidden="true" />
              {t('editor.generatePlanner')}
            </motion.button>
          </aside>

          <div className="editor-showcase__main">
            <div className="editor-showcase__toolbar">
              <span className="editor-showcase__tool editor-showcase__tool--active">
                <MousePointer2 size={14} aria-hidden="true" />
              </span>
              <span className="editor-showcase__tool">
                <Hand size={14} aria-hidden="true" />
              </span>
            </div>

            <div className="editor-showcase__canvas-wrap">
              <motion.div
                className="editor-showcase__page"
                initial={false}
                animate={{
                  opacity: isUploadPhase && !prefersReducedMotion ? [0.4, 1] : 1,
                  scale: isUploadPhase && !prefersReducedMotion ? [0.97, 1] : 1,
                }}
                transition={{ duration: 0.8 }}
              >
                <div className="editor-showcase__page-header">
                  <div className="editor-showcase__header-slot">
                    <div className="editor-showcase__layout-line editor-showcase__layout-line--title" />
                    <AnimatePresence>
                      {monthZoneVisible && (
                        <motion.div
                          className={`editor-showcase__zone editor-showcase__zone--month${zonesConfirmed ? ' editor-showcase__zone--confirmed' : ''}`}
                          style={{
                            borderColor: monthConfig.color,
                            backgroundColor: monthConfig.bgColor,
                          }}
                          initial={false}
                          animate={{
                            opacity: isZonesPhase && !prefersReducedMotion ? [0, 1] : 1,
                            scale: isZonesPhase && !prefersReducedMotion ? [0.92, 1] : 1,
                          }}
                          transition={{ duration: 0.5, delay: isZonesPhase ? 0.25 : 0 }}
                        >
                          <AnimatePresence mode="wait">
                            {showTypeBadges && (
                              <motion.span
                                key="badge-month"
                                className="editor-showcase__zone-badge"
                                style={{ color: monthConfig.color }}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                              >
                                {t('landing.showcase.blockMonth')}
                              </motion.span>
                            )}
                            {datesVisible && (
                              <motion.span
                                key="date-month"
                                className="editor-showcase__zone-label"
                                style={{ color: monthConfig.color }}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                              >
                                {t('landing.showcase.sampleMonth')}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="editor-showcase__layout-line editor-showcase__layout-line--subtitle" />
                </div>

                <div className="editor-showcase__page-grid">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="editor-showcase__cell">
                      {i === 0 && dayZoneVisible && (
                        <motion.div
                          className={`editor-showcase__zone editor-showcase__zone--day${zonesConfirmed ? ' editor-showcase__zone--confirmed' : ''}`}
                          style={{
                            borderColor: dayConfig.color,
                            backgroundColor: dayConfig.bgColor,
                          }}
                          initial={false}
                          animate={{
                            opacity: isZonesPhase && !prefersReducedMotion ? [0, 1] : 1,
                            scale: isZonesPhase && !prefersReducedMotion ? [0.92, 1] : 1,
                          }}
                          transition={{ duration: 0.5, delay: isZonesPhase ? 0.65 : 0 }}
                        >
                          <AnimatePresence mode="wait">
                            {showTypeBadges && (
                              <motion.span
                                key="badge-day"
                                className="editor-showcase__zone-badge"
                                style={{ color: dayConfig.color }}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.15 }}
                              >
                                {t('landing.showcase.blockDay')}
                              </motion.span>
                            )}
                            {datesVisible && (
                              <motion.span
                                key="date-day"
                                className="editor-showcase__zone-label"
                                style={{ color: dayConfig.color }}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: 0.15 }}
                              >
                                {t('landing.showcase.sampleDay')}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>

                <AnimatePresence>
                  {isUploadPhase && !prefersReducedMotion && (
                    <motion.div
                      className="editor-showcase__drop-overlay"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: [1, 1, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.5, times: [0, 0.6, 1] }}
                    >
                      <Upload size={20} aria-hidden="true" />
                      <span>{t('landing.steps.upload.title')}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showCursor && (
                    <motion.div
                      className="editor-showcase__cursor"
                      initial={{ opacity: 0, x: '42%', y: '38%' }}
                      animate={{
                        opacity: [0, 1, 1, 1],
                        x: ['42%', '42%', '14%', '14%'],
                        y: ['38%', '38%', '38%', '88%'],
                      }}
                      transition={{ duration: 2.8, ease: 'easeInOut', times: [0, 0.15, 0.55, 1] }}
                    >
                      <MousePointer2 size={18} aria-hidden="true" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isGeneratePhase && !prefersReducedMotion && (
                    <motion.div
                      className="editor-showcase__sparkle"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.8, 1, 1.1] }}
                      transition={{ duration: 1.2, delay: 0.3 }}
                    >
                      <Sparkles size={16} aria-hidden="true" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <AnimatePresence>
                {dialogVisible && (
                  <motion.div
                    className="editor-showcase__dialog"
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.35 }}
                  >
                    <p className="editor-showcase__dialog-title">
                      <FileDown size={12} aria-hidden="true" />
                      {t('generator.title')}
                    </p>
                    <div className="editor-showcase__dialog-fields">
                      <div className="editor-showcase__field">
                        <span>{t('generator.startDate')}</span>
                        <strong>{t('landing.showcase.startDate')}</strong>
                      </div>
                      <div className="editor-showcase__field">
                        <span>{t('generator.endDate')}</span>
                        <strong>{t('landing.showcase.endDate')}</strong>
                      </div>
                    </div>
                    <div className="editor-showcase__dialog-action">
                      <Download size={14} aria-hidden="true" />
                      {t('generator.downloadPdf')}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="editor-showcase__thumbs">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`editor-showcase__thumb${i === 0 ? ' editor-showcase__thumb--active' : ''}${isGeneratePhase ? ' editor-showcase__thumb--filled' : ''}`}
                >
                  {isGeneratePhase && (
                    <div className="editor-showcase__thumb-preview" aria-hidden="true">
                      <span />
                      <span />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showMobileBar && (
            <motion.div
              className="editor-showcase__mobile-bar"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              <span className="editor-showcase__mobile-bar-name">
                {t('landing.showcase.templateName')}
              </span>
              <span
                className={`editor-showcase__mobile-bar-btn${generateHighlighted ? ' editor-showcase__mobile-bar-btn--highlight' : ''}`}
              >
                <Sparkles size={12} aria-hidden="true" />
                {t('editor.generatePlanner')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <figcaption className="editor-showcase__guide">
        <div className="editor-showcase__stepper" aria-hidden="true">
          {PHASES.map((step, index) => (
            <div
              key={step}
              className={`editor-showcase__step${
                index === phaseIndex && !prefersReducedMotion
                  ? ' editor-showcase__step--active'
                  : index < phaseIndex && !prefersReducedMotion
                    ? ' editor-showcase__step--done'
                    : prefersReducedMotion && step === 'generate'
                      ? ' editor-showcase__step--active'
                      : ''
              }`}
            >
              <span className="editor-showcase__step-dot">
                <span className="editor-showcase__step-icon">
                  <StepDotContent
                    step={step}
                    index={index}
                    phaseIndex={phaseIndex}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                </span>
              </span>
              {index < PHASES.length - 1 && <span className="editor-showcase__step-line" />}
            </div>
          ))}
        </div>

        <div className="editor-showcase__step-copy" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePhase}
              className="editor-showcase__step-text"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <div className="editor-showcase__step-heading">
                <span className="editor-showcase__step-number">
                  {prefersReducedMotion ? PHASES.length : phaseIndex + 1}/{PHASES.length}
                </span>
                <PhaseIcon size={16} aria-hidden="true" />
                <strong>{stepTitle}</strong>
              </div>
              <p className="editor-showcase__step-description">{stepText}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </figcaption>
    </figure>
  );
}

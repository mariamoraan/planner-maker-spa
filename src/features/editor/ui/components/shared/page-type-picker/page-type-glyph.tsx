import type { TemplateType } from '@/features/template';

interface PageTypeGlyphProps {
  type: TemplateType;
  className?: string;
}

/** Compact schematic previews for each planner page type. */
export function PageTypeGlyph({ type, className }: PageTypeGlyphProps) {
  return (
    <span className={className} aria-hidden="true" data-type={type}>
      {type === 'cover' && (
        <svg viewBox="0 0 40 52" fill="none">
          <rect x="4" y="2" width="32" height="48" rx="3" className="page-type-glyph__frame" />
          <rect x="10" y="14" width="20" height="3" rx="1" className="page-type-glyph__accent" />
          <rect x="12" y="22" width="16" height="2" rx="1" className="page-type-glyph__muted" />
          <rect x="14" y="28" width="12" height="2" rx="1" className="page-type-glyph__muted" />
        </svg>
      )}
      {type === 'month-cover' && (
        <svg viewBox="0 0 40 52" fill="none">
          <rect x="4" y="2" width="32" height="48" rx="3" className="page-type-glyph__frame" />
          <rect x="10" y="18" width="20" height="8" rx="1.5" className="page-type-glyph__accent" />
          <rect x="12" y="32" width="16" height="2" rx="1" className="page-type-glyph__muted" />
        </svg>
      )}
      {type === 'extra' && (
        <svg viewBox="0 0 40 52" fill="none">
          <rect x="4" y="2" width="32" height="48" rx="3" className="page-type-glyph__frame" />
          <path d="M10 14h20M10 22h20M10 30h14M10 38h18" className="page-type-glyph__line" />
        </svg>
      )}
      {type === 'yearly-calendar' && (
        <svg viewBox="0 0 40 52" fill="none">
          <rect x="4" y="2" width="32" height="48" rx="3" className="page-type-glyph__frame" />
          {Array.from({ length: 12 }, (_, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            return (
              <rect
                key={i}
                x={8 + col * 9}
                y={8 + row * 10}
                width="7"
                height="7"
                rx="1"
                className="page-type-glyph__cell"
              />
            );
          })}
        </svg>
      )}
      {type === 'monthly-calendar' && (
        <svg viewBox="0 0 40 52" fill="none">
          <rect x="4" y="2" width="32" height="48" rx="3" className="page-type-glyph__frame" />
          <rect x="8" y="7" width="24" height="3" rx="1" className="page-type-glyph__accent" />
          {Array.from({ length: 35 }, (_, i) => {
            const col = i % 7;
            const row = Math.floor(i / 7);
            return (
              <rect
                key={i}
                x={8 + col * 3.5}
                y={14 + row * 6.5}
                width="2.8"
                height="5"
                rx="0.5"
                className="page-type-glyph__cell"
              />
            );
          })}
        </svg>
      )}
      {type === 'weekly-calendar' && (
        <svg viewBox="0 0 40 52" fill="none">
          <rect x="4" y="2" width="32" height="48" rx="3" className="page-type-glyph__frame" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect
              key={i}
              x={7 + i * 4.2}
              y="8"
              width="3.4"
              height="36"
              rx="0.8"
              className="page-type-glyph__cell"
            />
          ))}
        </svg>
      )}
      {type === 'daily-page' && (
        <svg viewBox="0 0 40 52" fill="none">
          <rect x="4" y="2" width="32" height="48" rx="3" className="page-type-glyph__frame" />
          <rect x="8" y="8" width="12" height="8" rx="1.5" className="page-type-glyph__accent" />
          <path d="M8 24h24M8 31h24M8 38h16" className="page-type-glyph__line" />
        </svg>
      )}
    </span>
  );
}

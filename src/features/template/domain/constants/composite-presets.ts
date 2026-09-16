import type { CompositePart } from '../value-objects/field-style';

export interface CompositePreset {
  id: string;
  label: string;
  preview: string;
  parts: CompositePart[];
}

export const DEFAULT_COMPOSITE_PARTS: CompositePart[] = [
  { kind: 'weekday', variant: 'full' },
  { kind: 'literal', value: ' ' },
  { kind: 'day', variant: 'numeric' },
];

export const COMPOSITE_PRESETS: readonly CompositePreset[] = [
  {
    id: 'weekday-day',
    label: 'Weekday + day',
    preview: 'Lunes 3',
    parts: [
      { kind: 'weekday', variant: 'full' },
      { kind: 'literal', value: ' ' },
      { kind: 'day', variant: 'numeric' },
    ],
  },
  {
    id: 'day-month',
    label: 'Day + month',
    preview: '3 marzo',
    parts: [
      { kind: 'day', variant: 'numeric' },
      { kind: 'literal', value: ' ' },
      { kind: 'month', variant: 'name' },
    ],
  },
  {
    id: 'month-year',
    label: 'Month + year',
    preview: 'marzo 2026',
    parts: [
      { kind: 'month', variant: 'name' },
      { kind: 'literal', value: ' ' },
      { kind: 'year', variant: 'YYYY' },
    ],
  },
  {
    id: 'day-slash-month',
    label: 'Day / month',
    preview: '12/03',
    parts: [
      { kind: 'day', variant: 'numeric' },
      { kind: 'literal', value: '/' },
      { kind: 'month', variant: 'numeric' },
    ],
  },
  {
    id: 'weekday-newline-day',
    label: 'Weekday / day',
    preview: 'Lunes↵3',
    parts: [
      { kind: 'weekday', variant: 'full' },
      { kind: 'literal', value: '\n' },
      { kind: 'day', variant: 'numeric' },
    ],
  },
];

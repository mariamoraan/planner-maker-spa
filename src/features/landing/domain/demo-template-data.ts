import type { Template } from '@/features/template';

export const DEMO_TEMPLATE_ID = 'demo-planner';

const now = new Date();
const pageSrc = '/demo/weekly-planner.svg';

function page(
  id: string,
  name: string,
  type: Template['images'][number]['type'],
  rectangles: Template['images'][number]['rectangles'] = [],
) {
  return {
    id,
    name,
    type,
    width: 1200,
    height: 1600,
    src: pageSrc,
    rectangles,
    createdAt: now,
    updatedAt: now,
    missingLocalAsset: false,
  };
}

export const DEMO_TEMPLATE: Template = {
  id: DEMO_TEMPLATE_ID,
  name: '2026 Weekly Planner',
  description: 'Demo planner for marketing assets',
  images: [
    page('page-cover', 'Cover', 'cover'),
    page('page-month-cover', 'Month Cover', 'month-cover'),
    page('page-monthly', 'Monthly Calendar', 'monthly-calendar', [
      {
        id: 'rect-month',
        x: 420,
        y: 220,
        width: 360,
        height: 56,
        fieldType: 'month',
        order: 0,
        formatVariant: 'name',
      },
      {
        id: 'rect-day-1',
        x: 168,
        y: 430,
        width: 48,
        height: 36,
        fieldType: 'day',
        order: 1,
      },
    ]),
    page('page-weekly', 'Weekly Spread', 'weekly-calendar', [
      {
        id: 'rect-start-day',
        x: 160,
        y: 430,
        width: 48,
        height: 36,
        fieldType: 'startDay',
        order: 0,
      },
      {
        id: 'rect-end-day',
        x: 920,
        y: 430,
        width: 48,
        height: 36,
        fieldType: 'endDay',
        order: 1,
      },
    ]),
    page('page-daily', 'Daily Page', 'daily-page', [
      {
        id: 'rect-day-daily',
        x: 120,
        y: 180,
        width: 120,
        height: 48,
        fieldType: 'day',
        order: 0,
      },
    ]),
    page('page-extra', 'Notes', 'extra'),
  ],
  createdAt: now,
  updatedAt: now,
  locale: 'en',
  weekStartsOn: 'monday',
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2026, 11, 31),
};

export const DEMO_HOME_TEMPLATES: Template[] = [
  DEMO_TEMPLATE,
  {
    ...DEMO_TEMPLATE,
    id: 'demo-minimal',
    name: 'Minimal Daily Journal',
    images: [page('page-daily-2', 'Daily Page', 'daily-page')],
  },
];

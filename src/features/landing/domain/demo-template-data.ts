import {
  layoutGridRectangles,
  type GridLayoutConfig,
} from '@/features/editor/domain/services/grid-layout';
import {
  paperSizeToPixels,
  DEFAULT_PAPER_SIZE,
} from '@/features/template/domain/services/paper-size';
import type {
  BindingGroup,
  FieldStyle,
  GridGroup,
  Rectangle,
  Template,
} from '@/features/template';

export const DEMO_TEMPLATE_ID = 'demo-planner';
const DEMO_MONTHLY_DAY_GRID_ID = 'grid-demo-monthly-days';
const DEMO_MONTHLY_BINDING_ID = 'bind-demo-monthly-days';
const DEMO_WEEKLY_DAY_GRID_ID = 'grid-demo-weekly-days';
const DEMO_WEEKLY_BINDING_ID = 'bind-demo-weekly-days';

const DEMO_PAGE_SIZE = paperSizeToPixels(DEFAULT_PAPER_SIZE);

const now = new Date();
const coverSrc = '/demo/cover.png';
const monthlyCalendarSrc = '/demo/month-calendar.png';
const weeklyPlannerSrc = '/demo/weekly-planner.png';
const dailyPageSrc = '/demo/daily-planner.png';

const DEMO_DAY_STYLE: FieldStyle = {
  color: '#1f2a3d',
  fontId: 'gloria',
  bold: false,
  italic: false,
  textCase: 'capitalize',
  textAlign: 'center',
};

function page(
  id: string,
  name: string,
  type: Template['images'][number]['type'],
  pageSrc: string,
  rectangles: Template['images'][number]['rectangles'] = [],
  gridGroups?: Record<string, GridGroup>,
  bindingGroups?: Record<string, BindingGroup>,
) {
  return {
    id,
    name,
    type,
    width: DEMO_PAGE_SIZE.width,
    height: DEMO_PAGE_SIZE.height,
    src: pageSrc,
    rectangles,
    gridGroups,
    bindingGroups,
    createdAt: now,
    updatedAt: now,
    missingLocalAsset: false,
  };
}

/** Captured 2026-09-24 — monthly calendar day grid */
const MONTHLY_DAY_GRID: GridLayoutConfig = {
  origin: { x: 256, y: 950 },
  bounds: { x: 256, y: 950, width: 1969, height: 2308 },
  cols: 7,
  rows: 5,
  cellSize: { width: 281, height: 462 },
  rectSize: { width: 118, height: 77 },
  alignH: 'left',
  alignV: 'top',
  padding: { x: 30, y: 32 },
  gap: { x: 0, y: 0 },
};

/** Captured 2026-09-24 — weekly spread day column */
const WEEKLY_DAY_GRID: GridLayoutConfig = {
  origin: { x: 1141, y: 885 },
  bounds: { x: 1141, y: 885, width: 209, height: 2220 },
  cols: 1,
  rows: 6,
  cellSize: { width: 209, height: 331 },
  rectSize: { width: 149, height: 118 },
  alignH: 'center',
  alignV: 'center',
  padding: { x: 0, y: 0 },
  gap: { x: 0, y: 47 },
};

function buildWeeklyCalendarPage() {
  const dayRectangles = layoutGridRectangles(
    6,
    WEEKLY_DAY_GRID,
    (index, { x, y }) => ({
      id: `rect-week-day-${index + 1}`,
      x,
      y,
      width: WEEKLY_DAY_GRID.rectSize.width,
      height: WEEKLY_DAY_GRID.rectSize.height,
      fieldType: 'day' as const,
      order: index,
      formatVariant: 'numeric' as const,
      style: { ...DEMO_DAY_STYLE },
      gridGroupId: DEMO_WEEKLY_DAY_GRID_ID,
      gridCellIndex: index,
      bindingGroupId: DEMO_WEEKLY_BINDING_ID,
      sequenceIndex: index,
    }),
  );

  const rectIds = dayRectangles.map((rect) => rect.id);
  const bounds = WEEKLY_DAY_GRID.bounds!;

  const gridGroups: Record<string, GridGroup> = {
    [DEMO_WEEKLY_DAY_GRID_ID]: {
      id: DEMO_WEEKLY_DAY_GRID_ID,
      rectIds,
      cols: WEEKLY_DAY_GRID.cols,
      rows: WEEKLY_DAY_GRID.rows,
      bounds,
      settings: {
        cols: WEEKLY_DAY_GRID.cols,
        rows: WEEKLY_DAY_GRID.rows,
        alignH: 'center',
        alignV: 'center',
        rectWidth: WEEKLY_DAY_GRID.rectSize.width,
        rectHeight: WEEKLY_DAY_GRID.rectSize.height,
        padding: WEEKLY_DAY_GRID.padding,
        gap: WEEKLY_DAY_GRID.gap,
      },
      bindingGroupId: DEMO_WEEKLY_BINDING_ID,
    },
  };

  const bindingGroups: Record<string, BindingGroup> = {
    [DEMO_WEEKLY_BINDING_ID]: {
      id: DEMO_WEEKLY_BINDING_ID,
      source: 'weekDays',
    },
  };

  return page(
    'page-weekly',
    'Weekly Spread',
    'weekly-calendar',
    weeklyPlannerSrc,
    dayRectangles,
    gridGroups,
    bindingGroups,
  );
}

function buildMonthlyCalendarPage() {
  const dayRectangles = layoutGridRectangles(
    35,
    MONTHLY_DAY_GRID,
    (index, { x, y }) => ({
      id: `rect-day-${index + 1}`,
      x,
      y,
      width: MONTHLY_DAY_GRID.rectSize.width,
      height: MONTHLY_DAY_GRID.rectSize.height,
      fieldType: 'day' as const,
      order: index + 2,
      formatVariant: 'numeric' as const,
      style: { ...DEMO_DAY_STYLE },
      gridGroupId: DEMO_MONTHLY_DAY_GRID_ID,
      gridCellIndex: index,
      bindingGroupId: DEMO_MONTHLY_BINDING_ID,
      sequenceIndex: index,
    }),
  );

  const rectIds = dayRectangles.map((rect) => rect.id);
  const bounds = MONTHLY_DAY_GRID.bounds!;

  const gridGroups: Record<string, GridGroup> = {
    [DEMO_MONTHLY_DAY_GRID_ID]: {
      id: DEMO_MONTHLY_DAY_GRID_ID,
      rectIds,
      cols: MONTHLY_DAY_GRID.cols,
      rows: MONTHLY_DAY_GRID.rows,
      bounds,
      settings: {
        cols: MONTHLY_DAY_GRID.cols,
        rows: MONTHLY_DAY_GRID.rows,
        alignH: 'left',
        alignV: 'top',
        rectWidth: MONTHLY_DAY_GRID.rectSize.width,
        rectHeight: MONTHLY_DAY_GRID.rectSize.height,
        padding: MONTHLY_DAY_GRID.padding,
        gap: MONTHLY_DAY_GRID.gap,
      },
      bindingGroupId: DEMO_MONTHLY_BINDING_ID,
    },
  };

  const bindingGroups: Record<string, BindingGroup> = {
    [DEMO_MONTHLY_BINDING_ID]: {
      id: DEMO_MONTHLY_BINDING_ID,
      source: 'monthDays',
    },
  };

  const rectangles: Rectangle[] = [
    {
      id: 'rect-month',
      x: 868,
      y: 482,
      width: 744,
      height: 232,
      fieldType: 'month',
      order: 0,
      formatVariant: 'name',
    },
    {
      id: 'rect-year',
      x: 1901,
      y: 636,
      width: 413,
      height: 153,
      fieldType: 'year',
      order: 0,
      formatVariant: 'name',
    },
    ...dayRectangles,
  ];

  return page(
    'page-monthly',
    'Monthly Calendar',
    'monthly-calendar',
    monthlyCalendarSrc,
    rectangles,
    gridGroups,
    bindingGroups,
  );
}

export const DEMO_TEMPLATE: Template = {
  id: DEMO_TEMPLATE_ID,
  name: 'Agenda',
  description: 'Demo planner for marketing assets',
  paperSize: { kind: 'A4', orientation: 'portrait' },
  images: [
    page('page-cover', 'Cover', 'cover', coverSrc),
    buildMonthlyCalendarPage(),
    buildWeeklyCalendarPage(),
    page('page-daily', 'Daily Page', 'daily-page', dailyPageSrc, [
      {
        id: 'rect-daily-weekday-day',
        x: 448,
        y: 513,
        width: 455,
        height: 99,
        fieldType: 'composite',
        order: 0,
        formatVariant: 'numeric',
        style: { ...DEMO_DAY_STYLE },
        compositeParts: [
          { kind: 'weekday', variant: 'full' },
          { kind: 'literal', value: ' ' },
          { kind: 'day', variant: 'numeric' },
        ],
      },
    ]),
  ],
  createdAt: now,
  updatedAt: now,
  locale: 'en',
  weekStartsOn: 'sunday',
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2026, 11, 31),
};

export const DEMO_HOME_TEMPLATES: Template[] = [
  DEMO_TEMPLATE,
  {
    ...DEMO_TEMPLATE,
    id: 'demo-minimal',
    name: 'Minimal Monthly Calendar',
    images: [buildMonthlyCalendarPage()],
    createdAt: now,
    updatedAt: now,
    locale: 'en',
    weekStartsOn: 'sunday',
    startDate: new Date(2026, 0, 1),
    endDate: new Date(2026, 11, 31),
  },
];

import {
  layoutGridRectangles,
  type GridLayoutConfig,
} from '@/features/editor/domain/services/grid-layout';
import {
  paperSizeToPixels,
  DEFAULT_PAPER_SIZE,
} from '@/features/template/domain/services/paper-size';
import type { GridGroup, Rectangle, Template } from '@/features/template';

export const DEMO_TEMPLATE_ID = 'demo-planner';
const DEMO_MONTHLY_DAY_GRID_ID = 'grid-demo-monthly-days';

const DEMO_PAGE_SIZE = paperSizeToPixels(DEFAULT_PAPER_SIZE);
const LEGACY_WIDTH = 1200;
const LEGACY_HEIGHT = 1600;
const SCALE_X = DEMO_PAGE_SIZE.width / LEGACY_WIDTH;
const SCALE_Y = DEMO_PAGE_SIZE.height / LEGACY_HEIGHT;

function sx(value: number): number {
  return Math.round(value * SCALE_X);
}

function sy(value: number): number {
  return Math.round(value * SCALE_Y);
}

const now = new Date();
const coverSrc = '/demo/cover.png';
const monthlyCalendarSrc = '/demo/month-calendar.png';
const weeklyPlannerSrc = '/demo/weekly-planner.png';
const dailyPageSrc = '/demo/daily-planner.png';

function page(
  id: string,
  name: string,
  type: Template['images'][number]['type'],
  pageSrc: string,
  rectangles: Template['images'][number]['rectangles'] = [],
  gridGroups?: Record<string, GridGroup>,
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
    createdAt: now,
    updatedAt: now,
    missingLocalAsset: false,
  };
}

const MONTHLY_DAY_GRID: GridLayoutConfig = {
  origin: { x: sx(120), y: sy(430) },
  cols: 7,
  rows: 5,
  cellSize: { width: sx(137), height: sy(211) },
  rectSize: { width: sx(48), height: sy(36) },
  align: 'top-left',
  padding: { x: sx(12), y: sy(10) },
};

const WEEKLY_DAY_GRID: GridLayoutConfig = {
  origin: { x: sx(510), y: sy(420) },
  cols: 1,
  rows: 6,
  cellSize: { width: sx(48), height: sy(175) },
  rectSize: { width: sx(48), height: sy(36) },
  align: 'top-left',
  padding: { x: sx(12), y: 0 },
};

const generateMonthlyCalendarDayRectangles = (): Rectangle[] =>
  layoutGridRectangles(35, MONTHLY_DAY_GRID, (index, { x, y }) => ({
    id: `rect-day-${index + 1}`,
    x,
    y,
    width: MONTHLY_DAY_GRID.rectSize.width,
    height: MONTHLY_DAY_GRID.rectSize.height,
    fieldType: 'day',
    order: index,
    formatVariant: 'name',
  }));

const generateWeeklyCalendarDayRectangles = (): Rectangle[] =>
  layoutGridRectangles(6, WEEKLY_DAY_GRID, (index, { x, y }) => ({
    id: `rect-day-${index + 1}`,
    x,
    y,
    width: WEEKLY_DAY_GRID.rectSize.width,
    height: WEEKLY_DAY_GRID.rectSize.height,
    fieldType: 'day',
    order: index,
    formatVariant: 'name',
  }));

function buildMonthlyCalendarPage() {
  const dayRectangles = generateMonthlyCalendarDayRectangles();
  const rectIds = dayRectangles.map(rect => rect.id);
  const bounds = {
    x: MONTHLY_DAY_GRID.origin.x,
    y: MONTHLY_DAY_GRID.origin.y,
    width: MONTHLY_DAY_GRID.cols * MONTHLY_DAY_GRID.cellSize.width,
    height: MONTHLY_DAY_GRID.rows * MONTHLY_DAY_GRID.cellSize.height,
  };
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
        align: MONTHLY_DAY_GRID.align ?? 'top-left',
        rectWidth: MONTHLY_DAY_GRID.rectSize.width,
        rectHeight: MONTHLY_DAY_GRID.rectSize.height,
        padding: MONTHLY_DAY_GRID.padding,
      },
    },
  };
  const rectangles: Rectangle[] = [
    {
      id: 'rect-month',
      x: sx(420),
      y: sy(220),
      width: sx(360),
      height: sy(106),
      fieldType: 'month',
      order: 0,
      formatVariant: 'name',
    },
    {
      id: 'rect-year',
      x: sx(920),
      y: sy(290),
      width: sx(200),
      height: sy(70),
      fieldType: 'year',
      order: 0,
      formatVariant: 'name',
    },
    ...dayRectangles.map((rect, index) => ({
      ...rect,
      gridGroupId: DEMO_MONTHLY_DAY_GRID_ID,
      gridCellIndex: index,
    })),
  ];

  return page(
    'page-monthly',
    'Monthly Calendar',
    'monthly-calendar',
    monthlyCalendarSrc,
    rectangles,
    gridGroups,
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
    page('page-weekly', 'Weekly Spread', 'weekly-calendar', weeklyPlannerSrc,
      [
        ...generateWeeklyCalendarDayRectangles(),
      ]
    ),
    page('page-daily', 'Daily Page', 'daily-page', dailyPageSrc, [
      {
        id: 'rect-day-daily',
        x: sx(220),
        y: sy(235),
        width: sx(120),
        height: sy(48),
        fieldType: 'day',
        order: 1,
      },
      {
        id: 'rect-day-month',
        x: sx(355),
        y: sy(235),
        width: sx(120),
        height: sy(48),
        fieldType: 'month',
        order: 1,
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

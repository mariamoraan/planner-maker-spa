import {
  layoutGridRectangles,
  type GridLayoutConfig,
} from '@/features/editor/domain/services/grid-layout';
import type { GridGroup, Rectangle, Template } from '@/features/template';

export const DEMO_TEMPLATE_ID = 'demo-planner';
const DEMO_MONTHLY_DAY_GRID_ID = 'grid-demo-monthly-days';

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
    width: 1200,
    height: 1600,
    src: pageSrc,
    rectangles,
    gridGroups,
    createdAt: now,
    updatedAt: now,
    missingLocalAsset: false,
  };
}

const MONTHLY_DAY_GRID: GridLayoutConfig = {
  origin: { x: 120, y: 430 },
  cols: 7,
  rows: 5,
  cellSize: { width: 137, height: 211 },
  rectSize: { width: 48, height: 36 },
  align: 'top-left',
  padding: { x: 12, y: 10 },
};

const WEEKLY_DAY_GRID: GridLayoutConfig = {
  origin: { x: 510, y: 420 },
  cols: 1,
  rows: 6,
  cellSize: { width: 48, height: 175 },
  rectSize: { width: 48, height: 36 },
  align: 'top-left',
  padding: { x: 12, y: 0 },
};

const generateMonthlyCalendarDayRectangles = (): Rectangle[] =>
  layoutGridRectangles(35, MONTHLY_DAY_GRID, (index, { x, y }) => ({
    id: `rect-day-${index + 1}`,
    x,
    y,
    width: 48,
    height: 36,
    fieldType: 'day',
    order: index,
    formatVariant: 'name',
  }));

const generateWeeklyCalendarDayRectangles = (): Rectangle[] =>
  layoutGridRectangles(6, WEEKLY_DAY_GRID, (index, { x, y }) => ({
    id: `rect-day-${index + 1}`,
    x,
    y,
    width: 48,
    height: 36,
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
      x: 420,
      y: 220,
      width: 360,
      height: 106,
      fieldType: 'month',
      order: 0,
      formatVariant: 'name',
    },
    {
      id: 'rect-year',
      x: 920,
      y: 290,
      width: 200,
      height: 70,
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
        x: 220,
        y: 235,
        width: 120,
        height: 48,
        fieldType: 'day',
        order: 1,
      },
      {
        id: 'rect-day-month',
        x: 355,
        y: 235,
        width: 120,
        height: 48,
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

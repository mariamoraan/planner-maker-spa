export const PATHS = {
    landing: '/',
    login: '/login',
    accessPending: '/access-pending',
    home: '/home',
    editor: '/editor/:templateId',
    landingDemoHome: '/landing-demo/home',
    landingDemoEditor: '/landing-demo/editor/:templateId',
} as const;

export const getEditorPath = (templateId: string) =>
    `/editor/${templateId}`;

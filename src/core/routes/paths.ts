export const PATHS = {
    landing: '/',
    home: '/home',
    editor: '/editor/:templateId',
} as const;

export const getEditorPath = (templateId: string) =>
    `/editor/${templateId}`;

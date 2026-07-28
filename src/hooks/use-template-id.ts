import { useParams } from 'react-router-dom';

export const useTemplateId = (): string | undefined => {
  const { templateId } = useParams<{ templateId: string }>();
  return templateId;
};

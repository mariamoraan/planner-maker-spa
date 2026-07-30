import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown } from 'lucide-react';
import React from 'react';

interface EditorSidebarSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const EditorSidebarSection: React.FC<EditorSidebarSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  open,
  onOpenChange,
}) => (
  <Collapsible.Root
    className="editor-sidebar__main__section"
    defaultOpen={open === undefined ? defaultOpen : undefined}
    open={open}
    onOpenChange={onOpenChange}
  >
    <Collapsible.Trigger asChild>
      <button type="button" className="editor-sidebar__main__section__trigger">
        <span className="editor-sidebar__main__section__trigger__title">{title}</span>
        <ChevronDown
          className="editor-sidebar__main__section__trigger__chevron"
          size={14}
          aria-hidden
        />
      </button>
    </Collapsible.Trigger>
    <Collapsible.Content className="editor-sidebar__main__section__content">
      <div className="editor-sidebar__main__section__content-inner">{children}</div>
    </Collapsible.Content>
  </Collapsible.Root>
);

import './manage-fonts-dialog.scss';

import { useState } from 'react';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Input } from '@/core/components/ui/input';
import { cssFamilyNameForCustomFont } from '@/features/fonts/domain/entities/custom-font-family';
import { useFontLibraryStore } from '@/features/fonts/ui/stores/font-library-store';
import { useTemplateStore } from '@/features/template/ui/stores/template-store';
import { UploadFontFamilyDialog } from '@/features/fonts/ui/components/upload-font-family-dialog/upload-font-family-dialog';

interface ManageFontsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestUpload?: () => void;
}

export function ManageFontsDialog({
  open,
  onOpenChange,
  onRequestUpload,
}: ManageFontsDialogProps) {
  const fonts = useFontLibraryStore(state => state.fonts);
  const renameFamily = useFontLibraryStore(state => state.renameFamily);
  const deleteFamily = useFontLibraryStore(state => state.deleteFamily);
  const templates = useTemplateStore(state => state.templates);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [replaceFontId, setReplaceFontId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const startRename = (fontId: string, name: string) => {
    setEditingId(fontId);
    setDraftName(name);
    setError(null);
  };

  const commitRename = async (fontId: string) => {
    setBusyId(fontId);
    setError(null);
    try {
      await renameFamily(fontId, draftName);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo renombrar');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (fontId: string) => {
    setBusyId(fontId);
    setError(null);
    try {
      await deleteFamily(fontId, templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  };

  const replaceTarget = fonts.find(font => font.id === replaceFontId) ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="dialog-content--wide manage-fonts-dialog">
          <DialogHeader>
            <DialogTitle>Tus tipografías</DialogTitle>
            <DialogDescription>
              Gestiona las tipografías de tu cuenta. No se pueden eliminar si están en uso en un planner.
            </DialogDescription>
          </DialogHeader>

          <div className="manage-fonts-dialog__toolbar">
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onRequestUpload?.();
              }}
            >
              <Upload size={16} />
              Subir tipografía
            </Button>
          </div>

          {fonts.length === 0 ? (
            <p className="manage-fonts-dialog__empty">Todavía no has subido tipografías.</p>
          ) : (
            <ul className="manage-fonts-dialog__list">
              {fonts.map(font => {
                const family = cssFamilyNameForCustomFont(font.id);
                const isEditing = editingId === font.id;
                return (
                  <li key={font.id} className="manage-fonts-dialog__item">
                    <div className="manage-fonts-dialog__meta">
                      {isEditing ? (
                        <Input
                          value={draftName}
                          onChange={e => setDraftName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') void commitRename(font.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="manage-fonts-dialog__name"
                          style={{ fontFamily: `"${family}", system-ui, sans-serif` }}
                        >
                          {font.name}
                        </span>
                      )}
                      <span className="manage-fonts-dialog__faces">
                        {font.faces.length} estilo{font.faces.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="manage-fonts-dialog__actions">
                      {isEditing ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === font.id}
                          onClick={() => void commitRename(font.id)}
                        >
                          Guardar
                        </Button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="manage-fonts-dialog__icon-btn"
                            title="Renombrar"
                            onClick={() => startRename(font.id, font.name)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="manage-fonts-dialog__icon-btn"
                            title="Reemplazar archivos"
                            onClick={() => {
                              setReplaceFontId(font.id);
                              onOpenChange(false);
                            }}
                          >
                            <Upload size={14} />
                          </button>
                          <button
                            type="button"
                            className="manage-fonts-dialog__icon-btn manage-fonts-dialog__icon-btn--danger"
                            title="Eliminar"
                            disabled={busyId === font.id}
                            onClick={() => void handleDelete(font.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {error ? <p className="manage-fonts-dialog__error">{error}</p> : null}
        </DialogContent>
      </Dialog>

      <UploadFontFamilyDialog
        open={Boolean(replaceFontId)}
        onOpenChange={next => {
          if (!next) {
            setReplaceFontId(null);
            onOpenChange(true);
          }
        }}
        editFontId={replaceFontId}
        initialName={replaceTarget?.name ?? ''}
      />
    </>
  );
}

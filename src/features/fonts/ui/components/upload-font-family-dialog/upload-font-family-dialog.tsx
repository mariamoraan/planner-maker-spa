import './upload-font-family-dialog.scss';

import { useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/ui/select';
import {
  FONT_FACE_ROLES,
  type FontFaceStyle,
  type FontFaceWeight,
} from '@/features/fonts/domain/entities/custom-font-family';
import {
  detectFontFaceRole,
  fileToDataUrl,
  isAllowedFontFile,
  suggestFamilyNameFromFileNames,
} from '@/features/fonts/domain/services/detect-font-style';
import {
  useFontLibraryStore,
  type PendingFontFace,
} from '@/features/fonts/ui/stores/font-library-store';
import { PlanLimitError, usePlanLimits } from '@/core/plans';
import { useTranslation } from 'react-i18next';

type FaceDraft = {
  localId: string;
  fileName: string;
  dataUrl: string;
  weight: FontFaceWeight;
  style: FontFaceStyle;
};

function roleValue(weight: FontFaceWeight, style: FontFaceStyle): string {
  return `${weight}-${style}`;
}

function parseRoleValue(value: string): { weight: FontFaceWeight; style: FontFaceStyle } {
  const [weightRaw, styleRaw] = value.split('-');
  return {
    weight: weightRaw === '700' ? 700 : 400,
    style: styleRaw === 'italic' ? 'italic' : 'normal',
  };
}

const FONT_ACCEPT = '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2';

interface UploadFontFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (fontId: string) => void;
  /** When set, replaces faces on an existing family instead of creating. */
  editFontId?: string | null;
  initialName?: string;
}

export function UploadFontFamilyDialog({
  open,
  onOpenChange,
  onCreated,
  editFontId = null,
  initialName = '',
}: UploadFontFamilyDialogProps) {
  const { t } = useTranslation();
  const { limits, canUploadFont } = usePlanLimits();
  const createFamily = useFontLibraryStore(state => state.createFamily);
  const replaceFaces = useFontLibraryStore(state => state.replaceFaces);
  const [name, setName] = useState(initialName);
  const [faces, setFaces] = useState<FaceDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickingFileRef = useRef(false);
  const busyRef = useRef(false);
  const dragDepthRef = useRef(0);

  const isEdit = Boolean(editFontId);

  const reset = () => {
    setName(initialName);
    setFaces([]);
    setError(null);
    setBusy(false);
    busyRef.current = false;
    setIsDragging(false);
    dragDepthRef.current = 0;
    pickingFileRef.current = false;
  };

  const preventDismissWhileBlocked = (event: Event) => {
    const target = event.target;
    const element = target instanceof Element ? target : null;
    // Radix Select / Popover content is portaled; treating it as "outside" was
    // closing this dialog instantly (often right when confirming styles / submit).
    if (
      element?.closest(
        '[data-radix-select-content], [data-radix-popper-content-wrapper], [data-radix-select-viewport]',
      )
    ) {
      event.preventDefault();
      return;
    }
    if (pickingFileRef.current || busyRef.current) {
      event.preventDefault();
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && pickingFileRef.current) return;
    if (!next && busyRef.current) return;
    if (!next) reset();
    else if (initialName) setName(initialName);
    onOpenChange(next);
  };

  const usedRoles = useMemo(
    () => new Set(faces.map(face => roleValue(face.weight, face.style))),
    [faces],
  );

  const handleFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList || (Array.isArray(fileList) ? fileList.length === 0 : fileList.length === 0)) {
      return;
    }
    setError(null);

    const nextFaces = [...faces];
    for (const file of Array.from(fileList)) {
      const check = isAllowedFontFile(file);
      if (!check.ok) {
        setError(check.reason);
        continue;
      }
      const detected = detectFontFaceRole(file.name);
      let weight = detected.weight;
      let style = detected.style;
      let role = roleValue(weight, style);

      if (usedRoles.has(role) || nextFaces.some(f => roleValue(f.weight, f.style) === role)) {
        const free = FONT_FACE_ROLES.find(
          candidate =>
            !nextFaces.some(
              f => f.weight === candidate.weight && f.style === candidate.style,
            ),
        );
        if (!free) {
          setError('Ya tienes los 4 estilos asignados');
          continue;
        }
        weight = free.weight;
        style = free.style;
        role = roleValue(weight, style);
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        nextFaces.push({
          localId: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          fileName: file.name,
          dataUrl,
          weight,
          style,
        });
      } catch {
        setError('No se pudo leer el archivo');
      }
    }

    setFaces(nextFaces);
    if (!name.trim() && nextFaces.length > 0) {
      setName(suggestFamilyNameFromFileNames(nextFaces.map(face => face.fileName)));
    }
  };

  const openFilePicker = () => {
    pickingFileRef.current = true;
    fileInputRef.current?.click();
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    // Keep the guard until after the native dialog fully closes / focus returns.
    window.setTimeout(() => {
      pickingFileRef.current = false;
    }, 300);
    void handleFiles(files);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  };

  const updateFaceRole = (localId: string, role: string) => {
    const parsed = parseRoleValue(role);
    setFaces(prev =>
      prev.map(face =>
        face.localId === localId
          ? { ...face, weight: parsed.weight, style: parsed.style }
          : face,
      ),
    );
  };

  const removeFace = (localId: string) => {
    setFaces(prev => prev.filter(face => face.localId !== localId));
  };

  const handleSubmit = async () => {
    if (busyRef.current) return;
    setError(null);
    if (!isEdit && !canUploadFont) {
      setError(t('limits.fontsLimitReached', { max: limits.maxFontFamilies }));
      return;
    }
    if (!name.trim()) {
      setError('Pon un nombre a la tipografía');
      return;
    }
    if (faces.length === 0) {
      setError('Añade al menos un archivo de tipografía');
      return;
    }
    if (!faces.some(face => face.weight === 400 && face.style === 'normal')) {
      setError('Necesitas al menos el estilo Regular');
      return;
    }

    const pending: PendingFontFace[] = faces.map(face => ({
      weight: face.weight,
      style: face.style,
      fileName: face.fileName,
      dataUrl: face.dataUrl,
    }));

    if (pending.some(face => !face.dataUrl)) {
      setError('Algunos archivos no se leyeron bien. Vuelve a añadirlos.');
      return;
    }

    setBusy(true);
    busyRef.current = true;
    try {
      if (isEdit && editFontId) {
        await replaceFaces(editFontId, pending);
        if (name.trim()) {
          await useFontLibraryStore.getState().renameFamily(editFontId, name.trim());
        }
        onCreated?.(editFontId);
      } else {
        const family = await createFamily(name.trim(), pending);
        onCreated?.(family.id);
      }
      busyRef.current = false;
      handleOpenChange(false);
    } catch (err) {
      console.error('[upload-font] save failed:', err);
      if (err instanceof PlanLimitError && err.code === 'fonts') {
        setError(t('limits.fontsLimitReached', { max: limits.maxFontFamilies }));
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo guardar la tipografía');
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="dialog-content--wide upload-font-dialog"
        onInteractOutside={preventDismissWhileBlocked}
        onPointerDownOutside={preventDismissWhileBlocked}
        onFocusOutside={preventDismissWhileBlocked}
        onEscapeKeyDown={event => {
          if (busyRef.current || pickingFileRef.current) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar tipografía' : 'Subir tipografía'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Sube archivos .ttf, .otf, .woff o .woff2 y asígnalos a Regular, Italic, Bold o Bold Italic.'
              : canUploadFont
                ? 'Sube archivos .ttf, .otf, .woff o .woff2 y asígnalos a Regular, Italic, Bold o Bold Italic.'
                : t('limits.fontsLimitReached', { max: limits.maxFontFamilies })}
          </DialogDescription>
        </DialogHeader>

        <div className="upload-font-dialog__body">
          <div className="upload-font-dialog__field">
            <Label htmlFor="font-family-name">Nombre</Label>
            <Input
              id="font-family-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Mi tipografía"
            />
          </div>

          <div className="upload-font-dialog__field">
            <Label>Archivos</Label>
            <input
              ref={fileInputRef}
              id="font-family-files"
              className="upload-font-dialog__file-input"
              type="file"
              accept={FONT_ACCEPT}
              multiple
              tabIndex={-1}
              onChange={onFileInputChange}
              onClick={e => e.stopPropagation()}
            />
            <button
              type="button"
              className={
                isDragging
                  ? 'upload-font-dialog__dropzone upload-font-dialog__dropzone--active'
                  : 'upload-font-dialog__dropzone'
              }
              onClick={openFilePicker}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
              disabled={busy || (!isEdit && !canUploadFont)}
            >
              <Upload size={22} aria-hidden="true" />
              <span className="upload-font-dialog__dropzone-title">
                {isDragging ? 'Suelta los archivos aquí' : 'Arrastra tipografías aquí'}
              </span>
              <span className="upload-font-dialog__dropzone-hint">
                o haz clic para elegir · .ttf .otf .woff .woff2
              </span>
            </button>
          </div>

          {faces.length > 0 ? (
            <ul className="upload-font-dialog__faces">
              {faces.map(face => (
                <li key={face.localId} className="upload-font-dialog__face">
                  <span className="upload-font-dialog__face-name" title={face.fileName}>
                    {face.fileName}
                  </span>
                  <Select
                    value={roleValue(face.weight, face.style)}
                    onValueChange={value => updateFaceRole(face.localId, value)}
                  >
                    <SelectTrigger className="upload-font-dialog__role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      onCloseAutoFocus={event => event.preventDefault()}
                      onPointerDownOutside={event => event.stopPropagation()}
                    >
                      {FONT_FACE_ROLES.map(role => (
                        <SelectItem
                          key={roleValue(role.weight, role.style)}
                          value={roleValue(role.weight, role.style)}
                        >
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    className="upload-font-dialog__remove"
                    onClick={() => removeFace(face.localId)}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {error ? <p className="upload-font-dialog__error">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || faces.length === 0 || (!isEdit && !canUploadFont)}
          >
            {busy ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Añadir tipografía'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

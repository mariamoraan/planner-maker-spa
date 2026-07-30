export const BLOCK_SELECTION_ZONE_ATTR = 'data-block-selection-zone';

export const blockSelectionZoneProps = {
  [BLOCK_SELECTION_ZONE_ATTR]: true,
} as const;

export function isInsideBlockSelectionZone(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  return Boolean(target.closest(`[${BLOCK_SELECTION_ZONE_ATTR}]`));
}

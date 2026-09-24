import { create } from 'zustand';
import { isDevToolsEnabled } from './is-dev-tools-enabled';

const LIMITS_DISABLED_KEY = 'dev-tools-limits-disabled';

function readLimitsDisabled(): boolean {
  if (!isDevToolsEnabled()) return false;
  try {
    return localStorage.getItem(LIMITS_DISABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

type DevToolsState = {
  limitsDisabled: boolean;
  setLimitsDisabled: (disabled: boolean) => void;
};

export const useDevToolsStore = create<DevToolsState>((set) => ({
  limitsDisabled: readLimitsDisabled(),
  setLimitsDisabled: (disabled) => {
    if (!isDevToolsEnabled()) return;
    try {
      localStorage.setItem(LIMITS_DISABLED_KEY, disabled ? 'true' : 'false');
    } catch {
      // ignore quota / private mode
    }
    set({ limitsDisabled: disabled });
  },
}));

/** Non-React read for stores / domain helpers. */
export function arePlanLimitsDisabled(): boolean {
  if (!isDevToolsEnabled()) return false;
  return useDevToolsStore.getState().limitsDisabled;
}

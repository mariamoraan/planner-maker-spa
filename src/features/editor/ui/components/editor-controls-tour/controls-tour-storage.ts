const TOUR_SEEN_KEY = 'amark.editor-controls-tour.v1';
const PENDING_TOUR_KEY = 'amark.pending-controls-tour';
const LEGACY_TOUR_SEEN_KEY = 'forma.editor-controls-tour.v1';
const LEGACY_PENDING_TOUR_KEY = 'forma.pending-controls-tour';

const migrateTourSeenKey = (): void => {
  try {
    if (localStorage.getItem(TOUR_SEEN_KEY) !== null) return;
    const legacy = localStorage.getItem(LEGACY_TOUR_SEEN_KEY);
    if (legacy === null) return;
    localStorage.setItem(TOUR_SEEN_KEY, legacy);
    localStorage.removeItem(LEGACY_TOUR_SEEN_KEY);
  } catch {
    // ignore quota / private mode
  }
};

const migratePendingTourKey = (): void => {
  try {
    if (sessionStorage.getItem(PENDING_TOUR_KEY) !== null) return;
    const legacy = sessionStorage.getItem(LEGACY_PENDING_TOUR_KEY);
    if (legacy === null) return;
    sessionStorage.setItem(PENDING_TOUR_KEY, legacy);
    sessionStorage.removeItem(LEGACY_PENDING_TOUR_KEY);
  } catch {
    // ignore
  }
};

export const hasSeenControlsTour = (): boolean => {
  migrateTourSeenKey();
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

export const markControlsTourSeen = (): void => {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, '1');
    localStorage.removeItem(LEGACY_TOUR_SEEN_KEY);
  } catch {
    // ignore quota / private mode
  }
  clearPendingControlsTour();
};

export const markPendingControlsTour = (): void => {
  if (hasSeenControlsTour()) return;
  try {
    sessionStorage.setItem(PENDING_TOUR_KEY, '1');
    sessionStorage.removeItem(LEGACY_PENDING_TOUR_KEY);
  } catch {
    // ignore
  }
};

export const hasPendingControlsTour = (): boolean => {
  migratePendingTourKey();
  try {
    return sessionStorage.getItem(PENDING_TOUR_KEY) === '1';
  } catch {
    return false;
  }
};

export const clearPendingControlsTour = (): void => {
  try {
    sessionStorage.removeItem(PENDING_TOUR_KEY);
    sessionStorage.removeItem(LEGACY_PENDING_TOUR_KEY);
  } catch {
    // ignore
  }
};

export const shouldShowControlsTour = (): boolean =>
  hasPendingControlsTour() && !hasSeenControlsTour();

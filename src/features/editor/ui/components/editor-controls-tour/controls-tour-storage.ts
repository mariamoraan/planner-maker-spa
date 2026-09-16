const TOUR_SEEN_KEY = 'forma.editor-controls-tour.v1';
const PENDING_TOUR_KEY = 'forma.pending-controls-tour';

export const hasSeenControlsTour = (): boolean => {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === '1';
  } catch {
    return false;
  }
};

export const markControlsTourSeen = (): void => {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, '1');
  } catch {
    // ignore quota / private mode
  }
  clearPendingControlsTour();
};

export const markPendingControlsTour = (): void => {
  if (hasSeenControlsTour()) return;
  try {
    sessionStorage.setItem(PENDING_TOUR_KEY, '1');
  } catch {
    // ignore
  }
};

export const hasPendingControlsTour = (): boolean => {
  try {
    return sessionStorage.getItem(PENDING_TOUR_KEY) === '1';
  } catch {
    return false;
  }
};

export const clearPendingControlsTour = (): void => {
  try {
    sessionStorage.removeItem(PENDING_TOUR_KEY);
  } catch {
    // ignore
  }
};

export const shouldShowControlsTour = (): boolean =>
  hasPendingControlsTour() && !hasSeenControlsTour();

export const BACKUP_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
export const SNOOZE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = "dagger:backup-reminder";
export const BACKUP_REMINDER_EVENT = "dagger:backup-reminder-changed";

export interface BackupReminderState {
  lastExportRequestedAt: number | null;
  snoozedUntil: number | null;
}

const EMPTY_STATE: BackupReminderState = { lastExportRequestedAt: null, snoozedUntil: null };

function validTime(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function readBackupReminder(): BackupReminderState {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!value || typeof value !== "object") return EMPTY_STATE;
    const record = value as Record<string, unknown>;
    return {
      lastExportRequestedAt: validTime(record.lastExportRequestedAt),
      snoozedUntil: validTime(record.snoozedUntil),
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function shouldShowBackupNudge(state: BackupReminderState, bookmarkCount: number, now = Date.now()): boolean {
  if (bookmarkCount === 0 || (state.snoozedUntil !== null && state.snoozedUntil > now)) return false;
  return state.lastExportRequestedAt === null || now - state.lastExportRequestedAt >= BACKUP_INTERVAL_MS;
}

function save(state: BackupReminderState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(BACKUP_REMINDER_EVENT));
  } catch {
    // The reminder remains optional when browser storage is unavailable.
  }
}

export function recordExportRequest(now = Date.now()): void {
  save({ lastExportRequestedAt: now, snoozedUntil: null });
}

export function snoozeBackupReminder(now = Date.now()): void {
  save({ ...readBackupReminder(), snoozedUntil: now + SNOOZE_INTERVAL_MS });
}

import { beforeEach, describe, expect, it } from "vitest";
import { BACKUP_INTERVAL_MS, readBackupReminder, recordExportRequest, shouldShowBackupNudge, snoozeBackupReminder } from "../reminders";

beforeEach(() => localStorage.clear());

describe("backup reminder", () => {
  it("nudges only when there is data and the last export request is old", () => {
    const now = 1_000_000_000_000;
    expect(shouldShowBackupNudge({ lastExportRequestedAt: null, snoozedUntil: null }, 0, now)).toBe(false);
    expect(shouldShowBackupNudge({ lastExportRequestedAt: null, snoozedUntil: null }, 1, now)).toBe(true);
    expect(shouldShowBackupNudge({ lastExportRequestedAt: now - BACKUP_INTERVAL_MS + 1, snoozedUntil: null }, 1, now)).toBe(false);
    expect(shouldShowBackupNudge({ lastExportRequestedAt: now - BACKUP_INTERVAL_MS, snoozedUntil: null }, 1, now)).toBe(true);
  });

  it("records export requests and honors a seven-day snooze", () => {
    const now = 1_000_000_000_000;
    recordExportRequest(now - BACKUP_INTERVAL_MS);
    snoozeBackupReminder(now);
    expect(shouldShowBackupNudge(readBackupReminder(), 1, now)).toBe(false);
    expect(shouldShowBackupNudge(readBackupReminder(), 1, now + 7 * 24 * 60 * 60 * 1000)).toBe(true);
    recordExportRequest(now);
    expect(shouldShowBackupNudge(readBackupReminder(), 1, now)).toBe(false);
  });

  it("ignores corrupt stored reminder data", () => {
    localStorage.setItem("dagger:backup-reminder", "not json");
    expect(readBackupReminder()).toEqual({ lastExportRequestedAt: null, snoozedUntil: null });
  });
});

import { db } from "../db/client";
import type { Bookmark, Tag } from "../types/entities";
import { recordExportRequest } from "./reminders";

export interface BackupData {
  bookmarks: Bookmark[];
  tags: Tag[];
  exportedAt: string;
  version: 1;
}

export async function createBackupData(): Promise<BackupData> {
  const [bookmarks, tags] = await db.transaction("r", db.bookmarks, db.tags, () =>
    Promise.all([db.bookmarks.toArray(), db.tags.toArray()]),
  );
  return { bookmarks, tags, exportedAt: new Date().toISOString(), version: 1 };
}

export async function downloadBackup(): Promise<void> {
  const data = JSON.stringify(await createBackupData(), null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = `dagger_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    try {
      link.click();
      recordExportRequest();
    } finally {
      link.remove();
    }
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

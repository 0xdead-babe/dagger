import { db } from "../db/client";
import type { Bookmark, Tag, TrashEntry } from "../types/entities";
import { bookmarkUrlKey, isSafeBookmarkUrl } from "../utils/url";

export interface OrphanTagReference {
  bookmark: Bookmark;
  tagIds: string[];
}

export interface HealthReport {
  duplicateBookmarks: Bookmark[][];
  unsafeBookmarks: Bookmark[];
  orphanTagReferences: OrphanTagReference[];
  duplicateTags: Tag[][];
  malformedBookmarks: Bookmark[];
  malformedTags: Tag[];
}

export function analyzeData(bookmarks: Bookmark[], tags: Tag[], trash: TrashEntry[]): HealthReport {
  const activeTagIds = new Set(tags.map((tag) => tag.id));
  const recoverableTagIds = new Set(trash.filter((entry): entry is Extract<TrashEntry, { kind: "tag" }> => entry.kind === "tag")
    .map((entry) => entry.tag.id));
  const urlGroups = new Map<string, Bookmark[]>();
  const tagGroups = new Map<string, Tag[]>();
  const unsafeBookmarks: Bookmark[] = [];
  const orphanTagReferences: OrphanTagReference[] = [];
  const malformedBookmarks: Bookmark[] = [];
  const malformedTags: Tag[] = [];

  for (const bookmark of bookmarks) {
    if (typeof bookmark.title !== "string" || !Array.isArray(bookmark.tagIds)) malformedBookmarks.push(bookmark);
    if (!isSafeBookmarkUrl(bookmark.url)) unsafeBookmarks.push(bookmark);
    else {
      const key = bookmarkUrlKey(bookmark.url);
      urlGroups.set(key, [...(urlGroups.get(key) ?? []), bookmark]);
    }
    const orphanIds = [...new Set(Array.isArray(bookmark.tagIds) ? bookmark.tagIds : [])]
      .filter((id) => !activeTagIds.has(id) && !recoverableTagIds.has(id));
    if (orphanIds.length > 0) orphanTagReferences.push({ bookmark, tagIds: orphanIds });
  }
  for (const tag of tags) {
    if (typeof tag.name !== "string" || !tag.name.trim()) malformedTags.push(tag);
    const key = typeof tag.name === "string" ? tag.name.trim().toLocaleLowerCase() : "";
    if (key) tagGroups.set(key, [...(tagGroups.get(key) ?? []), tag]);
  }
  return {
    duplicateBookmarks: [...urlGroups.values()].filter((group) => group.length > 1),
    unsafeBookmarks,
    orphanTagReferences,
    duplicateTags: [...tagGroups.values()].filter((group) => group.length > 1),
    malformedBookmarks,
    malformedTags,
  };
}

export async function runHealthScan(): Promise<HealthReport> {
  return db.transaction("r", db.bookmarks, db.tags, db.trash, async () => {
    const [bookmarks, tags, trash] = await Promise.all([
      db.bookmarks.toArray(), db.tags.toArray(), db.trash.toArray(),
    ]);
    return analyzeData(bookmarks, tags, trash);
  });
}

export async function repairOrphanTagReferences(): Promise<number> {
  return db.transaction("rw", db.bookmarks, db.tags, db.trash, async () => {
    const [bookmarks, tags, trash] = await Promise.all([
      db.bookmarks.toArray(), db.tags.toArray(), db.trash.toArray(),
    ]);
    const knownIds = new Set(tags.map((tag) => tag.id));
    for (const entry of trash) if (entry.kind === "tag") knownIds.add(entry.tag.id);
    const changed = bookmarks.flatMap((bookmark) => {
      const current = Array.isArray(bookmark.tagIds) ? bookmark.tagIds : [];
      const tagIds = current.filter((id) => knownIds.has(id));
      return Array.isArray(bookmark.tagIds) && tagIds.length === current.length ? [] : [{ ...bookmark, tagIds, updatedAt: Date.now() }];
    });
    await db.bookmarks.bulkPut(changed);
    return changed.length;
  });
}

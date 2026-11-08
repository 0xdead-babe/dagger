import { db } from "./client";
import type { Bookmark, TrashEntry } from "../types/entities";
import { isSafeBookmarkUrl } from "../utils/url";

export async function moveBookmarkToTrash(id: string): Promise<void> {
  await db.transaction("rw", db.bookmarks, db.trash, async () => {
    const bookmark = await db.bookmarks.get(id);
    if (!bookmark) throw new Error("Bookmark not found.");
    await db.trash.add({ id: crypto.randomUUID(), kind: "bookmark", deletedAt: Date.now(), bookmark });
    await db.bookmarks.delete(id);
  });
}

export async function moveTagToTrash(id: string): Promise<void> {
  await db.transaction("rw", db.bookmarks, db.tags, db.trash, async () => {
    const tag = await db.tags.get(id);
    if (!tag) throw new Error("Tag not found.");
    const affected = await db.bookmarks.where("tagIds").equals(id).toArray();
    const now = Date.now();
    await db.trash.add({
      id: crypto.randomUUID(), kind: "tag", deletedAt: now,
      tag, affectedBookmarkIds: affected.map((bookmark) => bookmark.id),
    });
    await db.bookmarks.bulkPut(affected.map((bookmark) => ({
      ...bookmark, tagIds: (Array.isArray(bookmark.tagIds) ? bookmark.tagIds : []).filter((tagId) => tagId !== id), updatedAt: now,
    })));
    await db.tags.delete(id);
  });
}

export async function restoreTrashEntry(id: string): Promise<void> {
  await db.transaction("rw", db.bookmarks, db.tags, db.trash, async () => {
    const entry = await db.trash.get(id);
    if (!entry) throw new Error("Trash item not found.");

    if (entry.kind === "bookmark") {
      if (!isSafeBookmarkUrl(entry.bookmark.url)) {
        throw new Error("This bookmark has an unsafe URL and cannot be restored. Its details remain in Trash.");
      }
      const originalId = entry.bookmark.id;
      const restoredId = await db.bookmarks.get(originalId) ? crypto.randomUUID() : originalId;
      const [tags, deletedTags] = await Promise.all([db.tags.toArray(), db.trash.where("kind").equals("tag").toArray()]);
      const availableTagIds = new Set(tags.map((tag) => tag.id));
      for (const deletedTag of deletedTags) {
        if (deletedTag.kind === "tag") availableTagIds.add(deletedTag.tag.id);
      }
      const bookmark: Bookmark = {
        ...entry.bookmark,
        id: restoredId,
        tagIds: [...new Set((Array.isArray(entry.bookmark.tagIds) ? entry.bookmark.tagIds : []).filter((tagId) => availableTagIds.has(tagId)))],
      };
      await db.bookmarks.add(bookmark);
      if (restoredId !== originalId) {
        const changed = deletedTags.flatMap((deletedTag) => {
          if (deletedTag.kind !== "tag" || !deletedTag.affectedBookmarkIds.includes(originalId)) return [];
          return [{ ...deletedTag, affectedBookmarkIds: deletedTag.affectedBookmarkIds.map((bookmarkId) => bookmarkId === originalId ? restoredId : bookmarkId) }];
        });
        await db.trash.bulkPut(changed);
      }
    } else {
      const activeTags = await db.tags.toArray();
      const existing = activeTags.find((tag) => tag.name.toLocaleLowerCase() === entry.tag.name.toLocaleLowerCase());
      const restoredTagId = existing?.id ?? (activeTags.some((tag) => tag.id === entry.tag.id) ? crypto.randomUUID() : entry.tag.id);
      if (!existing) await db.tags.add({ ...entry.tag, id: restoredTagId });
      const affectedIds = new Set(entry.affectedBookmarkIds);
      const remap = (tagIds: string[], bookmarkId: string): string[] => {
        const mapped = tagIds.map((tagId) => tagId === entry.tag.id ? restoredTagId : tagId);
        if (affectedIds.has(bookmarkId)) mapped.push(restoredTagId);
        return [...new Set(mapped)];
      };
      const bookmarks = await db.bookmarks.toArray();
      const updated: Bookmark[] = [];
      for (const bookmark of bookmarks) {
        const currentTagIds = Array.isArray(bookmark.tagIds) ? bookmark.tagIds : [];
        const tagIds = remap(currentTagIds, bookmark.id);
        if (!Array.isArray(bookmark.tagIds) || tagIds.length !== currentTagIds.length || tagIds.some((tagId, index) => tagId !== currentTagIds[index])) {
          updated.push({ ...bookmark, tagIds, updatedAt: Date.now() });
        }
      }
      await db.bookmarks.bulkPut(updated);
      const deletedBookmarks = await db.trash.where("kind").equals("bookmark").toArray();
      const updatedTrash: TrashEntry[] = [];
      for (const item of deletedBookmarks) {
        if (item.kind !== "bookmark") continue;
        const currentTagIds = Array.isArray(item.bookmark.tagIds) ? item.bookmark.tagIds : [];
        const tagIds = remap(currentTagIds, item.bookmark.id);
        if (!Array.isArray(item.bookmark.tagIds) || tagIds.length !== currentTagIds.length || tagIds.some((tagId, index) => tagId !== currentTagIds[index])) {
          updatedTrash.push({ ...item, bookmark: { ...item.bookmark, tagIds } });
        }
      }
      await db.trash.bulkPut(updatedTrash);
    }
    await db.trash.delete(id);
  });
}

export async function permanentlyDeleteTrashEntry(id: string): Promise<void> {
  await db.transaction("rw", db.bookmarks, db.tags, db.trash, async () => {
    const entry = await db.trash.get(id);
    if (!entry) throw new Error("Trash item not found.");
    if (entry.kind === "tag" && !(await db.tags.get(entry.tag.id))) {
      await removeTagReferences(new Set([entry.tag.id]));
    }
    await db.trash.delete(id);
  });
}

export async function emptyTrash(): Promise<void> {
  await db.transaction("rw", db.bookmarks, db.tags, db.trash, async () => {
    const [entries, tags] = await Promise.all([db.trash.toArray(), db.tags.toArray()]);
    const activeIds = new Set(tags.map((tag) => tag.id));
    const removedTagIds = new Set(entries.filter((entry): entry is Extract<TrashEntry, { kind: "tag" }> => entry.kind === "tag")
      .map((entry) => entry.tag.id).filter((id) => !activeIds.has(id)));
    await removeTagReferences(removedTagIds);
    await db.trash.clear();
  });
}

async function removeTagReferences(tagIds: Set<string>): Promise<void> {
  if (tagIds.size === 0) return;
  const bookmarks = await db.bookmarks.toArray();
  const changed = bookmarks.flatMap((bookmark) => {
    const current = Array.isArray(bookmark.tagIds) ? bookmark.tagIds : [];
    const kept = current.filter((tagId) => !tagIds.has(tagId));
    return Array.isArray(bookmark.tagIds) && kept.length === current.length ? [] : [{ ...bookmark, tagIds: kept, updatedAt: Date.now() }];
  });
  await db.bookmarks.bulkPut(changed);
}

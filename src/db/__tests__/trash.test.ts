/** @vitest-environment node */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../client";
import { addBookmark, deleteBookmark } from "../bookmarks";
import { addTag, deleteTag } from "../tags";
import { emptyTrash, permanentlyDeleteTrashEntry, restoreTrashEntry } from "../trash";

beforeEach(async () => {
  await db.bookmarks.clear();
  await db.tags.clear();
  await db.trash.clear();
});

describe("Trash recovery", () => {
  it("restores a deleted bookmark with its original fields", async () => {
    const tagId = await addTag({ name: "Reading" });
    const id = await addBookmark({ url: "https://example.com/path", title: "Saved", tagIds: [tagId], description: "Notes", pinned: true, read: true });
    const original = await db.bookmarks.get(id);
    await deleteBookmark(id);
    expect(await db.bookmarks.get(id)).toBeUndefined();
    const entry = await db.trash.toCollection().first();
    expect(entry).toMatchObject({ kind: "bookmark", bookmark: original });
    await restoreTrashEntry(entry!.id);
    expect(await db.bookmarks.get(id)).toEqual(original);
    expect(await db.trash.count()).toBe(0);
  });

  it("restores a tag and its memberships when bookmarks were deleted in between", async () => {
    const tagId = await addTag({ name: "Research" });
    const bookmarkId = await addBookmark({ url: "https://example.com", title: "Example", tagIds: [tagId] });
    await deleteTag(tagId);
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([]);
    await deleteBookmark(bookmarkId);
    const entries = await db.trash.toArray();
    const tagEntry = entries.find((entry) => entry.kind === "tag")!;
    const bookmarkEntry = entries.find((entry) => entry.kind === "bookmark")!;
    await restoreTrashEntry(tagEntry.id);
    await restoreTrashEntry(bookmarkEntry.id);
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([tagId]);
  });

  it("restores memberships when the bookmark is restored before the tag", async () => {
    const tagId = await addTag({ name: "Research" });
    const bookmarkId = await addBookmark({ url: "https://example.com", title: "Example", tagIds: [tagId] });
    await deleteTag(tagId);
    await deleteBookmark(bookmarkId);
    const entries = await db.trash.toArray();
    const tagEntry = entries.find((entry) => entry.kind === "tag")!;
    const bookmarkEntry = entries.find((entry) => entry.kind === "bookmark")!;
    await restoreTrashEntry(bookmarkEntry.id);
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([]);
    await restoreTrashEntry(tagEntry.id);
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([tagId]);
  });

  it("merges a restored tag with an existing name and remaps memberships", async () => {
    const oldId = await addTag({ name: "Research" });
    const bookmarkId = await addBookmark({ url: "https://example.com", title: "Example", tagIds: [oldId] });
    await deleteTag(oldId);
    const replacementId = await addTag({ name: "research" });
    const entry = await db.trash.toCollection().first();
    await restoreTrashEntry(entry!.id);
    expect(await db.tags.count()).toBe(1);
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([replacementId]);
  });

  it("permanent tag deletion clears references from restored bookmarks", async () => {
    const tagId = await addTag({ name: "Gone" });
    const bookmarkId = await addBookmark({ url: "https://example.com", title: "Example", tagIds: [tagId] });
    await deleteBookmark(bookmarkId);
    await deleteTag(tagId);
    const entries = await db.trash.toArray();
    const bookmarkEntry = entries.find((entry) => entry.kind === "bookmark")!;
    const tagEntry = entries.find((entry) => entry.kind === "tag")!;
    await restoreTrashEntry(bookmarkEntry.id);
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([tagId]);
    await permanentlyDeleteTrashEntry(tagEntry.id);
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([]);
  });

  it("empties Trash without changing active bookmarks", async () => {
    const keepId = await addBookmark({ url: "https://keep.example", title: "Keep", tagIds: [] });
    const removeId = await addBookmark({ url: "https://remove.example", title: "Remove", tagIds: [] });
    await deleteBookmark(removeId);
    await emptyTrash();
    expect(await db.trash.count()).toBe(0);
    expect(await db.bookmarks.get(keepId)).toBeDefined();
    expect(await db.bookmarks.get(removeId)).toBeUndefined();
  });

  it("empties Trash and removes references to permanently deleted tags", async () => {
    const tagId = await addTag({ name: "Temporary" });
    const bookmarkId = await addBookmark({ url: "https://example.com", title: "Example", tagIds: [tagId] });
    await deleteBookmark(bookmarkId);
    await deleteTag(tagId);
    const bookmarkEntry = (await db.trash.toArray()).find((entry) => entry.kind === "bookmark")!;
    await restoreTrashEntry(bookmarkEntry.id);
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([tagId]);
    await emptyTrash();
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([]);
    expect(await db.trash.count()).toBe(0);
  });

  it("uses a new bookmark ID on collision and still restores its tag links", async () => {
    const tagId = await addTag({ name: "Research" });
    const id = await addBookmark({ url: "https://old.example", title: "Old", tagIds: [tagId] });
    await deleteTag(tagId);
    await deleteBookmark(id);
    await db.bookmarks.add({ id, url: "https://new.example", title: "New", tagIds: [], createdAt: 2, updatedAt: 2 });
    const entries = await db.trash.toArray();
    const bookmarkEntry = entries.find((entry) => entry.kind === "bookmark")!;
    const tagEntry = entries.find((entry) => entry.kind === "tag")!;
    await restoreTrashEntry(bookmarkEntry.id);
    await restoreTrashEntry(tagEntry.id);
    const restored = (await db.bookmarks.toArray()).find((bookmark) => bookmark.url === "https://old.example");
    expect(restored?.id).not.toBe(id);
    expect(restored?.tagIds).toEqual([tagId]);
    expect((await db.bookmarks.get(id))?.tagIds).toEqual([]);
  });

  it("keeps an unsafe legacy bookmark in Trash when restoration is rejected", async () => {
    await db.bookmarks.add({ id: "unsafe", url: "javascript:alert(1)", title: "Old", tagIds: [], createdAt: 1, updatedAt: 1 });
    await deleteBookmark("unsafe");
    const entry = await db.trash.toCollection().first();
    await expect(restoreTrashEntry(entry!.id)).rejects.toThrow("unsafe URL");
    expect(await db.trash.count()).toBe(1);
    expect(await db.bookmarks.count()).toBe(0);
  });

  it("rolls back tag deletion if Trash cannot be written", async () => {
    const tagId = await addTag({ name: "Important" });
    const bookmarkId = await addBookmark({ url: "https://example.com", title: "Example", tagIds: [tagId] });
    const fail = () => { throw new Error("Simulated Trash failure"); };
    db.trash.hook("creating", fail);
    try {
      await expect(deleteTag(tagId)).rejects.toThrow("Simulated Trash failure");
    } finally {
      db.trash.hook("creating").unsubscribe(fail);
    }
    expect(await db.tags.get(tagId)).toBeDefined();
    expect((await db.bookmarks.get(bookmarkId))?.tagIds).toEqual([tagId]);
    expect(await db.trash.count()).toBe(0);
  });
});

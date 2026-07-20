/** @vitest-environment node */
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../client";
import { addBookmark, updateBookmark, deleteBookmark } from "../bookmarks";

describe("bookmarks CRUD", () => {
  beforeEach(async () => {
    await db.bookmarks.clear();
    await db.tags.clear();
  });

  it("adds a bookmark with valid data", async () => {
    const bookmarkData = {
      url: "https://example.com",
      title: "Example Domain",
      tagIds: [],
    };

    const id = await addBookmark(bookmarkData);
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");

    const bookmark = await db.bookmarks.get(id);
    expect(bookmark).toMatchObject({
      ...bookmarkData,
      id,
    });
    expect(bookmark?.createdAt).toBeDefined();
    expect(bookmark?.updatedAt).toBeDefined();
  });

  it("updates a bookmark", async () => {
    const id = await addBookmark({
      url: "https://example.com",
      title: "Example",
      tagIds: [],
    });

    const updates = {
      title: "Updated Example",
      tagIds: ["tag-1"],
    };

    await updateBookmark(id, updates);

    const updated = await db.bookmarks.get(id);
    expect(updated?.title).toBe("Updated Example");
    expect(updated?.tagIds).toEqual(["tag-1"]);
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(updated!.createdAt);
  });

  it("deletes a bookmark", async () => {
    const id = await addBookmark({
      url: "https://example.com",
      title: "Example",
      tagIds: [],
    });

    await deleteBookmark(id);

    const deleted = await db.bookmarks.get(id);
    expect(deleted).toBeUndefined();
  });
});

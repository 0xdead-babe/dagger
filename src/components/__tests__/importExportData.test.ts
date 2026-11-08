import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/client";
import { importBackup, importBrowserBookmarks } from "../importExportData";

const backup = {
  version: 1,
  tags: [{ id: "old-tag", name: "Research", color: "#aabbcc", createdAt: 100 }],
  bookmarks: [{
    id: "old-bookmark",
    url: "https://example.com/article",
    title: "Article",
    description: "Notes",
    tagIds: ["old-tag"],
    read: true,
    pinned: true,
    createdAt: 200,
    updatedAt: 300,
  }],
};

describe("backup import", () => {
  beforeEach(async () => {
    await db.bookmarks.clear();
    await db.tags.clear();
  });

  it("maps tags by case-insensitive name, preserves fields, and skips duplicate URLs", async () => {
    await db.tags.add({ id: "current-tag", name: "research", createdAt: 1 });

    const first = await importBackup(JSON.stringify(backup));
    expect(first).toEqual({ bookmarksAdded: 1, tagsAdded: 0, duplicatesSkipped: 0, unsupportedSkipped: 0 });
    expect(await db.tags.count()).toBe(1);
    const bookmark = await db.bookmarks.toCollection().first();
    expect(bookmark).toMatchObject({
      url: backup.bookmarks[0].url,
      title: "Article",
      description: "Notes",
      tagIds: ["current-tag"],
      read: true,
      pinned: true,
      createdAt: 200,
      updatedAt: 300,
    });
    expect(bookmark?.id).not.toBe("old-bookmark");

    const second = await importBackup(JSON.stringify(backup));
    expect(second).toEqual({ bookmarksAdded: 0, tagsAdded: 0, duplicatesSkipped: 1, unsupportedSkipped: 0 });
    expect(await db.bookmarks.count()).toBe(1);
  });

  it("rejects malformed records before writing anything", async () => {
    const invalid = {
      ...backup,
      bookmarks: [...backup.bookmarks, { ...backup.bookmarks[0], id: "bad", tagIds: ["missing"] }],
    };
    await expect(importBackup(JSON.stringify(invalid))).rejects.toThrow("unknown tag");
    expect(await db.bookmarks.count()).toBe(0);
    expect(await db.tags.count()).toBe(0);
  });

  it("rejects unsupported future backup versions", async () => {
    await expect(importBackup(JSON.stringify({ ...backup, version: 2 }))).rejects.toThrow("unsupported");
  });

  it("skips unsafe URLs while importing valid records", async () => {
    const mixed = {
      ...backup,
      bookmarks: [
        { ...backup.bookmarks[0], id: "unsafe", url: "javascript:alert(1)" },
        backup.bookmarks[0],
      ],
    };
    expect(await importBackup(JSON.stringify(mixed))).toEqual({
      bookmarksAdded: 1,
      tagsAdded: 1,
      duplicatesSkipped: 0,
      unsupportedSkipped: 1,
    });
    expect(await db.bookmarks.count()).toBe(1);
  });
});

describe("browser bookmark import", () => {
  beforeEach(async () => {
    await db.bookmarks.clear();
    await db.tags.clear();
  });

  it("converts nested folders to tags and skips repeated URLs", async () => {
    const tree = [{
      id: "0",
      title: "Bookmarks bar",
      children: [{
        id: "1",
        title: "Work",
        children: [
          { id: "2", title: "Example", url: "https://example.com", dateAdded: 123 },
          { id: "3", title: "Duplicate", url: "https://EXAMPLE.com/" },
          { id: "4", title: "Unsafe", url: "javascript:alert(1)" },
        ],
      }],
    }] as chrome.bookmarks.BookmarkTreeNode[];

    expect(await importBrowserBookmarks(tree)).toEqual({
      bookmarksAdded: 1,
      tagsAdded: 1,
      duplicatesSkipped: 1,
      unsupportedSkipped: 1,
    });
    const tag = await db.tags.toCollection().first();
    const bookmark = await db.bookmarks.toCollection().first();
    expect(tag?.name).toBe("Work");
    expect(bookmark).toMatchObject({ createdAt: 123, updatedAt: 123, tagIds: [tag?.id] });
  });
});

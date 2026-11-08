/** @vitest-environment node */
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { BookmarkDB } from "../client";

describe("database migration", () => {
  it("adds Trash without changing version 3 bookmarks or tags", async () => {
    const name = `dagger-migration-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(3).stores({
      bookmarks: "id, url, title, *tagIds, createdAt, pinned",
      tags: "id, name, createdAt",
    });
    await old.table("tags").add({ id: "tag", name: "Research", createdAt: 1 });
    await old.table("bookmarks").add({
      id: "bookmark", url: "https://example.com", title: "Example", tagIds: ["tag"], createdAt: 2, updatedAt: 2,
    });
    old.close();

    const migrated = new BookmarkDB(name);
    try {
      await migrated.open();
      expect((await migrated.bookmarks.get("bookmark"))?.tagIds).toEqual(["tag"]);
      expect((await migrated.tags.get("tag"))?.name).toBe("Research");
      expect(await migrated.trash.count()).toBe(0);
    } finally {
      await migrated.delete();
    }
  });
});

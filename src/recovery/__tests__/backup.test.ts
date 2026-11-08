/** @vitest-environment node */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/client";
import { addBookmark, deleteBookmark } from "../../db/bookmarks";
import { addTag } from "../../db/tags";
import { createBackupData } from "../backup";

beforeEach(async () => {
  await db.bookmarks.clear();
  await db.tags.clear();
  await db.trash.clear();
});

describe("backup snapshot", () => {
  it("exports current bookmarks and tags without local Trash items", async () => {
    const tagId = await addTag({ name: "Keep" });
    const activeId = await addBookmark({ url: "https://active.example", title: "Active", tagIds: [tagId] });
    const deletedId = await addBookmark({ url: "https://deleted.example", title: "Deleted", tagIds: [] });
    await deleteBookmark(deletedId);

    const snapshot = await createBackupData();
    expect(snapshot.version).toBe(1);
    expect(Number.isNaN(Date.parse(snapshot.exportedAt))).toBe(false);
    expect(snapshot.bookmarks.map((bookmark) => bookmark.id)).toEqual([activeId]);
    expect(snapshot.tags.map((tag) => tag.id)).toEqual([tagId]);
    expect(await db.trash.count()).toBe(1);
  });
});

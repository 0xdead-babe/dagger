/** @vitest-environment node */
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../client";
import { addTag, updateTag, deleteTag } from "../tags";
import { addBookmark } from "../bookmarks";

describe("tags CRUD", () => {
  beforeEach(async () => {
    await db.bookmarks.clear();
    await db.tags.clear();
  });

  it("adds a tag", async () => {
    const tagData = {
      name: "Work",
      color: "#ff0000",
    };

    const id = await addTag(tagData);
    expect(id).toBeDefined();

    const tag = await db.tags.get(id);
    expect(tag).toMatchObject({
      ...tagData,
      id,
    });
    expect(tag?.createdAt).toBeDefined();
  });

  it("updates a tag", async () => {
    const id = await addTag({ name: "Work" });

    await updateTag(id, { name: "Personal" });

    const updated = await db.tags.get(id);
    expect(updated?.name).toBe("Personal");
  });

  it("deletes a tag and performs cascading cleanup", async () => {
    const tagId = await addTag({ name: "To Delete" });
    const otherTagId = await addTag({ name: "Keep" });

    const bookmarkId = await addBookmark({
      url: "https://example.com",
      title: "Example",
      tagIds: [tagId, otherTagId],
    });

    const bookmarkBefore = await db.bookmarks.get(bookmarkId);
    expect(bookmarkBefore?.tagIds).toContain(tagId);
    expect(bookmarkBefore?.tagIds).toContain(otherTagId);

    await deleteTag(tagId);

    const deletedTag = await db.tags.get(tagId);
    expect(deletedTag).toBeUndefined();

    const bookmarkAfter = await db.bookmarks.get(bookmarkId);
    expect(bookmarkAfter?.tagIds).not.toContain(tagId);
    expect(bookmarkAfter?.tagIds).toContain(otherTagId);
    expect(bookmarkAfter?.tagIds).toHaveLength(1);
  });
});

/** @vitest-environment node */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../db/client";
import { analyzeData, repairOrphanTagReferences, runHealthScan } from "../health";
import type { Bookmark, Tag, TrashEntry } from "../../types/entities";

const bookmark = (id: string, url: string, tagIds: string[] = []): Bookmark => ({
  id, url, title: id, tagIds, createdAt: 1, updatedAt: 1,
});

beforeEach(async () => {
  await db.bookmarks.clear();
  await db.tags.clear();
  await db.trash.clear();
});

describe("data health", () => {
  it("finds duplicate URLs, unsafe URLs, duplicate tag names, and only truly orphaned links", () => {
    const tags: Tag[] = [{ id: "active", name: "Research", createdAt: 1 }, { id: "other", name: "research", createdAt: 2 }];
    const trash: TrashEntry[] = [{ id: "trash-tag", kind: "tag", deletedAt: 3, tag: { id: "recoverable", name: "Old", createdAt: 1 }, affectedBookmarkIds: [] }];
    const report = analyzeData([
      bookmark("a", "https://EXAMPLE.com/", ["active", "recoverable", "missing"]),
      bookmark("b", "https://example.com"),
      bookmark("c", "javascript:alert(1)"),
    ], tags, trash);
    expect(report.duplicateBookmarks.map((group) => group.map((item) => item.id))).toEqual([["a", "b"]]);
    expect(report.unsafeBookmarks.map((item) => item.id)).toEqual(["c"]);
    expect(report.orphanTagReferences).toMatchObject([{ bookmark: { id: "a" }, tagIds: ["missing"] }]);
    expect(report.duplicateTags).toHaveLength(1);
  });

  it("repairs orphan links without removing links to tags in Trash", async () => {
    await db.bookmarks.add(bookmark("a", "https://example.com", ["missing", "recoverable"]));
    await db.trash.add({ id: "trash-tag", kind: "tag", deletedAt: 3, tag: { id: "recoverable", name: "Old", createdAt: 1 }, affectedBookmarkIds: [] });
    expect((await runHealthScan()).orphanTagReferences).toHaveLength(1);
    expect(await repairOrphanTagReferences()).toBe(1);
    expect((await db.bookmarks.get("a"))?.tagIds).toEqual(["recoverable"]);
  });

  it("reports malformed legacy records without crashing", () => {
    const malformedBookmark = { ...bookmark("bad", "https://example.com"), tagIds: undefined } as unknown as Bookmark;
    const malformedTag = { id: "bad-tag", name: undefined, createdAt: 1 } as unknown as Tag;
    const report = analyzeData([malformedBookmark], [malformedTag], []);
    expect(report.malformedBookmarks.map((item) => item.id)).toEqual(["bad"]);
    expect(report.malformedTags.map((item) => item.id)).toEqual(["bad-tag"]);
  });
});

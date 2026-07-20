import Dexie, { type Table } from "dexie";
import type { Bookmark, Tag } from "../types/entities";

/**
 * Main Dexie database instance for Dagger extension.
 * Handles schema definitions and migrations for bookmarks and tags.
 */
class BookmarkDB extends Dexie {
  bookmarks!: Table<Bookmark>;
  tags!: Table<Tag>;

  constructor() {
    super("BookmarkDB");
    this.version(2).stores({
      bookmarks: "id, url, title, *tagIds, createdAt",
      tags: "id, name, createdAt",
    });
    this.version(3).stores({
      bookmarks: "id, url, title, *tagIds, createdAt, pinned",
      tags: "id, name, createdAt",
    });
  }
}

export const db = new BookmarkDB();

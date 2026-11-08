import Dexie, { type Table } from "dexie";
import type { Bookmark, Tag, TrashEntry } from "../types/entities";

export class BookmarkDB extends Dexie {
  bookmarks!: Table<Bookmark>;
  tags!: Table<Tag>;
  trash!: Table<TrashEntry>;

  constructor(name = "BookmarkDB") {
    super(name, { chromeTransactionDurability: "strict" });
    this.version(2).stores({
      bookmarks: "id, url, title, *tagIds, createdAt",
      tags: "id, name, createdAt",
    });
    this.version(3).stores({
      bookmarks: "id, url, title, *tagIds, createdAt, pinned",
      tags: "id, name, createdAt",
    });
    this.version(4).stores({
      bookmarks: "id, url, title, *tagIds, createdAt, pinned",
      tags: "id, name, createdAt",
      trash: "id, kind, deletedAt",
    });
  }
}

export const db = new BookmarkDB();

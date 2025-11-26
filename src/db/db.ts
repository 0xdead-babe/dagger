import Dexie from "dexie";
import type { Table } from "dexie";

export interface Tag {
  id?: number;
  name: string;
  color: string; // Hex color string
}

export interface Resource {
  id?: number;
  title: string;
  url: string;
  description?: string;
  read: boolean;
  createdAt: Date;
  tagIds: number[]; // Array of Tag IDs
}

export class BookmarkDB extends Dexie {
  resources!: Table<Resource>;
  tags!: Table<Tag>;

  constructor() {
    super("BookmarkDB");
    this.version(1).stores({
      resources: "++id, title, url, read, createdAt, *tagIds", // *tagIds for multi-entry indexing
      tags: "++id, name, color",
    });
    // Seed default tag
    this.on("ready", async () => {
      if ((await this.tags.count()) === 0) {
        await this.tags.add({ name: "resource", color: "#60A5FA" }); // Default blue color
      }
    });
  }
}

export const db = new BookmarkDB();

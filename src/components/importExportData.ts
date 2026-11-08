import { z } from "zod";
import { db } from "../db/client";
import type { Bookmark, Tag } from "../types/entities";
import { bookmarkUrlKey, isSafeBookmarkUrl } from "../utils/url";

const nonEmptyString = z.string().trim().min(1);
const timestamp = z.number().int().nonnegative().finite();

const tagSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  color: z.string().optional(),
  createdAt: timestamp,
});

const bookmarkSchema = z.object({
  id: nonEmptyString,
  url: nonEmptyString,
  title: nonEmptyString,
  description: z.string().optional(),
  favicon: z.string().optional(),
  tagIds: z.array(nonEmptyString),
  read: z.boolean().optional(),
  pinned: z.boolean().optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const backupSchema = z.object({
  version: z.literal(1).optional(),
  bookmarks: z.array(bookmarkSchema),
  tags: z.array(tagSchema),
});

export interface ImportResult {
  bookmarksAdded: number;
  tagsAdded: number;
  duplicatesSkipped: number;
  unsupportedSkipped: number;
}

export function parseBackup(content: string) {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("The file is not valid JSON.");
  }

  const result = backupSchema.safeParse(value);
  if (!result.success) {
    throw new Error("Invalid or unsupported Dagger backup format.");
  }

  const tagIds = new Set<string>();
  for (const tag of result.data.tags) {
    if (tagIds.has(tag.id)) throw new Error("The backup contains duplicate tag IDs.");
    tagIds.add(tag.id);
  }
  for (const bookmark of result.data.bookmarks) {
    if (bookmark.tagIds.some((id) => !tagIds.has(id))) {
      throw new Error("The backup contains a bookmark with an unknown tag.");
    }
  }
  return result.data;
}

export async function importBackup(content: string): Promise<ImportResult> {
  const backup = parseBackup(content);

  return db.transaction("rw", db.tags, db.bookmarks, async () => {
    const [existingTags, existingBookmarks] = await Promise.all([
      db.tags.toArray(),
      db.bookmarks.toArray(),
    ]);
    const tagByName = new Map(existingTags.map((tag) => [tag.name.toLocaleLowerCase(), tag.id]));
    const oldToNewId = new Map<string, string>();
    const newTags: Tag[] = [];

    for (const tag of backup.tags) {
      const key = tag.name.toLocaleLowerCase();
      let id = tagByName.get(key);
      if (!id) {
        id = crypto.randomUUID();
        newTags.push({ ...tag, id });
        tagByName.set(key, id);
      }
      oldToNewId.set(tag.id, id);
    }

    const existingUrls = new Set(existingBookmarks.map((bookmark) => bookmarkUrlKey(bookmark.url)));
    const newBookmarks: Bookmark[] = [];
    let duplicatesSkipped = 0;
    let unsupportedSkipped = 0;
    for (const bookmark of backup.bookmarks) {
      if (!isSafeBookmarkUrl(bookmark.url)) {
        unsupportedSkipped++;
        continue;
      }
      const key = bookmarkUrlKey(bookmark.url);
      if (existingUrls.has(key)) {
        duplicatesSkipped++;
        continue;
      }
      existingUrls.add(key);
      newBookmarks.push({
        ...bookmark,
        id: crypto.randomUUID(),
        tagIds: [...new Set(bookmark.tagIds.map((id) => oldToNewId.get(id)!))],
      });
    }

    await db.tags.bulkAdd(newTags);
    await db.bookmarks.bulkAdd(newBookmarks);
    return {
      bookmarksAdded: newBookmarks.length,
      tagsAdded: newTags.length,
      duplicatesSkipped,
      unsupportedSkipped,
    };
  });
}

export async function importBrowserBookmarks(
  tree: chrome.bookmarks.BookmarkTreeNode[],
): Promise<ImportResult> {
  return db.transaction("rw", db.tags, db.bookmarks, async () => {
    const [existingTags, existingBookmarks] = await Promise.all([
      db.tags.toArray(),
      db.bookmarks.toArray(),
    ]);
    const tagByName = new Map(existingTags.map((tag) => [tag.name.toLocaleLowerCase(), tag.id]));
    const existingUrls = new Set(existingBookmarks.map((bookmark) => bookmarkUrlKey(bookmark.url)));
    const newTags: Tag[] = [];
    const newBookmarks: Bookmark[] = [];
    let duplicatesSkipped = 0;
    let unsupportedSkipped = 0;

    const visit = (nodes: chrome.bookmarks.BookmarkTreeNode[], folderNames: string[]) => {
      for (const node of nodes) {
        if (node.url) {
          if (!isSafeBookmarkUrl(node.url)) {
            unsupportedSkipped++;
            continue;
          }
          const key = bookmarkUrlKey(node.url);
          if (existingUrls.has(key)) {
            duplicatesSkipped++;
            continue;
          }
          existingUrls.add(key);
          const tagIds = folderNames.map((name) => {
            const key = name.toLocaleLowerCase();
            let id = tagByName.get(key);
            if (!id) {
              id = crypto.randomUUID();
              newTags.push({ id, name, createdAt: Date.now() });
              tagByName.set(key, id);
            }
            return id;
          });
          const createdAt = node.dateAdded || Date.now();
          newBookmarks.push({
            id: crypto.randomUUID(),
            url: node.url,
            title: node.title || node.url,
            description: "",
            tagIds: [...new Set(tagIds)],
            read: false,
            createdAt,
            updatedAt: createdAt,
          });
        } else if (node.children) {
          const name = node.title.trim();
          const isRootFolder = ["Bookmarks bar", "Other bookmarks", "Mobile bookmarks"].includes(name);
          visit(node.children, name && !isRootFolder ? [...folderNames, name] : folderNames);
        }
      }
    };

    visit(tree, []);
    await db.tags.bulkAdd(newTags);
    await db.bookmarks.bulkAdd(newBookmarks);
    return {
      bookmarksAdded: newBookmarks.length,
      tagsAdded: newTags.length,
      duplicatesSkipped,
      unsupportedSkipped,
    };
  });
}

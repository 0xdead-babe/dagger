import { db } from "./client";
import { type Bookmark } from "../types/entities";
import { isSafeBookmarkUrl } from "../utils/url";
import { moveBookmarkToTrash } from "./trash";

export const addBookmark = async (
  data: Omit<Bookmark, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  if (!isSafeBookmarkUrl(data.url)) throw new Error("Bookmark URL must use HTTP or HTTPS.");
  const id = crypto.randomUUID();
  const now = Date.now();

  const bookmark: Bookmark = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await db.bookmarks.add(bookmark);
  return id;
};

export const updateBookmark = async (
  id: string,
  data: Partial<Omit<Bookmark, "id" | "createdAt" | "updatedAt">>,
): Promise<void> => {
  if (data.url !== undefined && !isSafeBookmarkUrl(data.url)) {
    throw new Error("Bookmark URL must use HTTP or HTTPS.");
  }
  const updated = await db.bookmarks.update(id, {
    ...data,
    updatedAt: Date.now(),
  });
  if (!updated) throw new Error("Bookmark not found.");
};

export const deleteBookmark = async (id: string): Promise<void> => {
  await moveBookmarkToTrash(id);
};

import { db } from "./client";
import { type Bookmark } from "../types/entities";

export const addBookmark = async (
  data: Omit<Bookmark, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
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
  await db.bookmarks.update(id, {
    ...data,
    updatedAt: Date.now(),
  });
};

export const deleteBookmark = async (id: string): Promise<void> => {
  await db.bookmarks.delete(id);
};

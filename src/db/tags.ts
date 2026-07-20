import { db } from "./client";
import { type Tag } from "../types/entities";

export const addTag = async (
  data: Omit<Tag, "id" | "createdAt">,
): Promise<string> => {
  const id = crypto.randomUUID();
  const tag: Tag = {
    ...data,
    id,
    createdAt: Date.now(),
  };

  await db.tags.add(tag);
  return id;
};

export const updateTag = async (
  id: string,
  data: Partial<Omit<Tag, "id" | "createdAt">>,
): Promise<void> => {
  await db.tags.update(id, data);
};

export const deleteTag = async (id: string): Promise<void> => {
  await db.transaction("rw", db.bookmarks, db.tags, async () => {
    await db.bookmarks
      .where("tagIds")
      .equals(id)
      .modify((bookmark) => {
        bookmark.tagIds = bookmark.tagIds.filter((tagId) => tagId !== id);
      });

    await db.tags.delete(id);
  });
};

import { db } from "./client";
import { type Tag } from "../types/entities";
import { moveTagToTrash } from "./trash";

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
  const updated = await db.tags.update(id, data);
  if (!updated) throw new Error("Tag not found.");
};

export const deleteTag = async (id: string): Promise<void> => {
  await moveTagToTrash(id);
};

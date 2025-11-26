import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import type { Tag } from "@/db/db";

export function useTags() {
  const tags = useLiveQuery(() => db.tags.toArray(), []);

  // Function to get resource count for a specific tag
  const getResourceCountForTag = async (tagId: number): Promise<number> => {
    return await db.resources.where("tagIds").anyOf(tagId).count();
  };

  const addTag = async (name: string, color: string) => {
    await db.tags.add({ name, color });
  };

  const updateTag = async (id: number, name: string, color: string) => {
    await db.tags.update(id, { name, color });
  };

  const deleteTag = async (id: number) => {
    // TODO: Implement logic to handle resources linked to this tag before deletion
    await db.tags.delete(id);
  };

  const getTagById = (id: number) => {
    return tags?.find((tag) => tag.id === id);
  };

  return {
    tags,
    addTag,
    updateTag,
    deleteTag,
    getTagById,
    getResourceCountForTag,
  };
}

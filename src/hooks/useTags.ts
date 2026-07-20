import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/client";
import { addTag, updateTag, deleteTag } from "@/db/tags";
import type { Tag } from "@/types/entities";

const DEFAULT_TAG_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
];

const generateUniqueColor = (existingColors: string[]): string => {
  const available = DEFAULT_TAG_COLORS.find((c) => !existingColors.includes(c));
  if (available) return available;
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
};

/**
 * Hook to interface with tags from the Dexie database.
 * Provides live queries of all tags and helper methods to mutate data.
 */
export function useTags() {
  const tags = useLiveQuery(() => db.tags.orderBy("createdAt").reverse().toArray(), []);

  const isLoading = tags === undefined;
  const safeTags = tags ?? [];

  const createTag = async (name: string, color?: string): Promise<string> => {
    const existingColors = safeTags.map((t) => t.color ?? "");
    const finalColor =
      color && color !== "#3b82f6"
        ? color
        : generateUniqueColor(existingColors);

    return await addTag({ name, color: finalColor });
  };

  const editTag = async (
    id: string,
    updates: Partial<Pick<Tag, "name" | "color">>,
  ) => {
    await updateTag(id, updates);
  };

  const removeTag = async (id: string) => {
    await deleteTag(id);
  };

  const getTagById = (id: string): Tag | undefined => {
    return safeTags.find((t) => t.id === id);
  };

  const getTagsByIds = (ids: string[]): Tag[] => {
    return safeTags.filter((t) => ids.includes(t.id));
  };

  const getBookmarkCountForTag = async (tagId: string): Promise<number> => {
    return db.bookmarks.where("tagIds").equals(tagId).count();
  };

  return {
    tags: safeTags,
    isLoading,
    addTag: createTag,
    updateTag: editTag,
    deleteTag: removeTag,
    getTagById,
    getTagsByIds,
    getBookmarkCountForTag,
  };
}

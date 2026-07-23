import { createContext, useContext, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/client";
import { addTag, updateTag, deleteTag } from "@/db/tags";
import type { Tag } from "@/types/entities";
import { TAG_COLOR_HEXES } from "@/constants/colors";

const generateUniqueColor = (existingColors: string[]): string => {
  const available = TAG_COLOR_HEXES.find((c) => !existingColors.includes(c));
  if (available) return available;
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
};

interface TagsContextValue {
  tags: Tag[];
  isLoading: boolean;
  addTag: (name: string, color?: string) => Promise<string>;
  updateTag: (id: string, updates: Partial<Pick<Tag, "name" | "color">>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  getTagById: (id: string) => Tag | undefined;
  getTagsByIds: (ids: string[]) => Tag[];
  getBookmarkCountForTag: (tagId: string) => Promise<number>;
}

const TagsContext = createContext<TagsContextValue | null>(null);

export function TagsProvider({ children }: { children: ReactNode }) {
  const tags = useLiveQuery(() => db.tags.orderBy("createdAt").reverse().toArray(), []);
  const isLoading = tags === undefined;
  const safeTags = tags ?? [];

  const createTag = async (name: string, color?: string): Promise<string> => {
    const existingColors = safeTags.map((t) => t.color ?? "");
    const finalColor = color && color !== "#3b82f6" ? color : generateUniqueColor(existingColors);
    return await addTag({ name, color: finalColor });
  };

  const editTag = async (id: string, updates: Partial<Pick<Tag, "name" | "color">>) => {
    await updateTag(id, updates);
  };

  const removeTag = async (id: string) => {
    await deleteTag(id);
  };

  const getTagById = (id: string): Tag | undefined => safeTags.find((t) => t.id === id);
  const getTagsByIds = (ids: string[]): Tag[] => safeTags.filter((t) => ids.includes(t.id));
  const getBookmarkCountForTag = async (tagId: string): Promise<number> => {
    return db.bookmarks.where("tagIds").equals(tagId).count();
  };

  return (
    <TagsContext.Provider value={{
      tags: safeTags, isLoading, addTag: createTag, updateTag: editTag,
      deleteTag: removeTag, getTagById, getTagsByIds, getBookmarkCountForTag,
    }}>
      {children}
    </TagsContext.Provider>
  );
}

export function useTags(): TagsContextValue {
  const ctx = useContext(TagsContext);
  if (!ctx) throw new Error("useTags must be used within a TagsProvider");
  return ctx;
}

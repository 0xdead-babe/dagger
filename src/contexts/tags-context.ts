import { createContext } from "react";
import type { Tag } from "@/types/entities";

export interface TagsContextValue {
  tags: Tag[];
  isLoading: boolean;
  addTag: (name: string, color?: string) => Promise<string>;
  updateTag: (id: string, updates: Partial<Pick<Tag, "name" | "color">>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  getTagById: (id: string) => Tag | undefined;
  getTagsByIds: (ids: string[]) => Tag[];
  getBookmarkCountForTag: (tagId: string) => Promise<number>;
}

export const TagsContext = createContext<TagsContextValue | null>(null);

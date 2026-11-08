import { createContext } from "react";
import type { Bookmark } from "@/types/entities";

export interface BookmarksContextValue {
  bookmarks: Bookmark[];
  isLoading: boolean;
  addBookmark: (bookmark: Omit<Bookmark, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  getBookmarkById: (id: string) => Bookmark | undefined;
}

export const BookmarksContext = createContext<BookmarksContextValue | null>(null);

import { createContext, useContext, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/client";
import { addBookmark, updateBookmark, deleteBookmark } from "@/db/bookmarks";
import type { Bookmark } from "@/types/entities";

interface BookmarksContextValue {
  bookmarks: Bookmark[];
  isLoading: boolean;
  addBookmark: (bookmark: Omit<Bookmark, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
  getBookmarkById: (id: string) => Bookmark | undefined;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const bookmarks = useLiveQuery(() => db.bookmarks.orderBy("createdAt").reverse().toArray(), []);
  const isLoading = bookmarks === undefined;
  const safeBookmarks = bookmarks ?? [];

  const handleAddBookmark = async (bookmark: Omit<Bookmark, "id" | "createdAt" | "updatedAt">): Promise<string> => {
    return await addBookmark(bookmark);
  };

  const handleUpdateBookmark = async (id: string, updates: Partial<Bookmark>) => {
    await updateBookmark(id, updates);
  };

  const handleDeleteBookmark = async (id: string) => {
    await deleteBookmark(id);
  };

  const getBookmarkById = (id: string): Bookmark | undefined => safeBookmarks.find((b) => b.id === id);

  return (
    <BookmarksContext.Provider value={{
      bookmarks: safeBookmarks,
      isLoading,
      addBookmark: handleAddBookmark,
      updateBookmark: handleUpdateBookmark,
      deleteBookmark: handleDeleteBookmark,
      getBookmarkById,
    }}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarksContext(): BookmarksContextValue {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error("useBookmarks must be used within a BookmarksProvider");
  return ctx;
}

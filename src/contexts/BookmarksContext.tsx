import { useEffect, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/client";
import { addBookmark, updateBookmark, deleteBookmark } from "@/db/bookmarks";
import type { Bookmark } from "@/types/entities";
import { BookmarksContext } from "./bookmarks-context";
const EMPTY_BOOKMARKS: Bookmark[] = [];

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const bookmarks = useLiveQuery(() => db.bookmarks.orderBy("createdAt").reverse().toArray(), []);
  const isLoading = bookmarks === undefined;
  const safeBookmarks = bookmarks ?? EMPTY_BOOKMARKS;

  useEffect(() => {
    if (bookmarks !== undefined && typeof chrome !== "undefined" && chrome.runtime?.id) {
      void chrome.runtime.sendMessage({ type: "BADGE_REFRESH" }).catch(() => {});
    }
  }, [bookmarks]);

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

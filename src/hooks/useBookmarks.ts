import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/client";
import { addBookmark, updateBookmark, deleteBookmark } from "@/db/bookmarks";

/**
 * Hook to interface with bookmarks from the Dexie database.
 * Provides live queries of all bookmarks and helper methods to mutate data.
 */
export function useBookmarks() {
  const bookmarks = useLiveQuery(() => db.bookmarks.toArray(), []);

  return {
    bookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    getBookmarkById: (id: string) => bookmarks?.find((b) => b.id === id),
    getBookmarkByUrl: (url: string) => bookmarks?.find((b) => b.url === url),
    togglePin: (id: string, pinned: boolean) => updateBookmark(id, { pinned }),
  };
}

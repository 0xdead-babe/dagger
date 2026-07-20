import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/client";
import type { Bookmark } from "../types/entities";
import type {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
} from "../types/worker";

/**
 * Hook to manage background web worker search for bookmarks.
 * Coordinates real-time Dexie updates and sends them to the search worker.
 *
 * @param searchTerm The string to search for in bookmark fields.
 * @param filterRead Optional boolean to filter by read status.
 * @param filterTagIds Array of tag IDs to filter by.
 */
export const useSearch = (
  searchTerm: string,
  filterRead?: boolean,
  filterTagIds: string[] = [],
) => {
  const [resultIds, setResultIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const isWorkerReady = useRef(false);
  const pendingInit = useRef<Bookmark[] | null>(null);
  const hasInitialized = useRef(false);

  const allBookmarks = useLiveQuery(() => db.bookmarks.toArray()) ?? [];

  const postMessage = useCallback((message: WorkerIncomingMessage) => {
    workerRef.current?.postMessage(message);
  }, []);

  const filterTagIdsStr = filterTagIds.join(",");

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/searchWorker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    isWorkerReady.current = false;

    worker.onmessage = (event: MessageEvent<WorkerOutgoingMessage>) => {
      const message = event.data;

      if (message.type === "READY") {
        isWorkerReady.current = true;
        if (pendingInit.current) {
          worker.postMessage({
            type: "INIT",
            payload: pendingInit.current,
          } as WorkerIncomingMessage);
          pendingInit.current = null;
        }
        return;
      }

      if (message.type === "SEARCH_RESULTS") {
        setResultIds(message.payload.ids);
        setIsSearching(false);
        return;
      }

      if (message.type === "ERROR") {
        console.error("Search worker error:", message.payload.message);
        setIsSearching(false);
      }
    };

    worker.onerror = (error) => {
      console.error("Search worker crashed:", error);
      setIsSearching(false);
    };

    const handleCreate = (_primKey: string, obj: Bookmark) => {
      if (!isWorkerReady.current) return;
      worker.postMessage({
        type: "UPSERT",
        payload: obj,
      } as WorkerIncomingMessage);
    };

    const handleUpdate = (
      mods: Partial<Bookmark>,
      _primKey: string,
      obj: Bookmark,
    ) => {
      if (!isWorkerReady.current) return;
      worker.postMessage({
        type: "UPSERT",
        payload: { ...obj, ...mods },
      } as WorkerIncomingMessage);
    };

    const handleDelete = (_primKey: string, obj: Bookmark) => {
      if (!isWorkerReady.current) return;
      worker.postMessage({
        type: "DELETE",
        payload: { id: obj.id },
      } as WorkerIncomingMessage);
    };

    db.bookmarks.hook("creating", handleCreate);
    db.bookmarks.hook("updating", handleUpdate);
    db.bookmarks.hook("deleting", handleDelete);

    return () => {
      worker.terminate();
      workerRef.current = null;
      isWorkerReady.current = false;
      hasInitialized.current = false;
      db.bookmarks.hook("creating").unsubscribe(handleCreate);
      db.bookmarks.hook("updating").unsubscribe(handleUpdate);
      db.bookmarks.hook("deleting").unsubscribe(handleDelete);
    };
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    if (allBookmarks.length === 0) return;

    hasInitialized.current = true;

    if (isWorkerReady.current) {
      postMessage({ type: "INIT", payload: allBookmarks });
    } else {
      pendingInit.current = allBookmarks;
    }
  }, [allBookmarks, postMessage]);

  useEffect(() => {
    const hasQuery = searchTerm.trim().length > 0;
    const hasFilters = filterTagIds.length > 0 || filterRead !== undefined;

    if (!hasQuery && !hasFilters) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResultIds([]);

      setIsSearching(false);
      return;
    }


    setIsSearching(true);

    const timeoutId = setTimeout(() => {
      postMessage({
        type: "SEARCH",
        payload: {
          query: searchTerm,
          filterRead,
          filterTagIds,
        },
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterRead, filterTagIdsStr, postMessage]);

  const results = useMemo(() => {
    const hasQuery = searchTerm.trim().length > 0;
    const hasFilters = filterTagIds.length > 0 || filterRead !== undefined;

    if (!hasQuery && !hasFilters) return allBookmarks;

    return resultIds
      .map((id) => allBookmarks.find((b) => b.id === id))
      .filter((b): b is Bookmark => b !== undefined);
  }, [allBookmarks, resultIds, searchTerm, filterRead, filterTagIdsStr]);

  return { results, isSearching };
};

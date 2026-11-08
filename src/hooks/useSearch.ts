import { useEffect, useMemo, useRef, useState } from "react";
import type { Bookmark } from "../types/entities";
import type { WorkerIncomingMessage, WorkerOutgoingMessage } from "../types/worker";

const EMPTY_BOOKMARKS: Bookmark[] = [];

export const useSearch = (
  searchTerm: string,
  filterRead?: boolean,
  filterTagIds: string[] = [],
  allBookmarks: Bookmark[] = EMPTY_BOOKMARKS,
) => {
  const [resultIds, setResultIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [ready, setReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const snapshotRef = useRef<Map<string, string>>(new Map());
  const filterTagIdsKey = JSON.stringify(filterTagIds);
  const hasSearch = searchTerm.trim().length > 0 || filterRead !== undefined || filterTagIds.length > 0;

  useEffect(() => {
    const worker = new Worker(new URL("../workers/searchWorker.ts", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerOutgoingMessage>) => {
      const message = event.data;
      if (message.type === "READY") {
        setReady(true);
      } else if (message.type === "SEARCH_RESULTS" && message.payload.requestId === requestIdRef.current) {
        setResultIds(message.payload.ids);
        setIsSearching(false);
      } else if (message.type === "ERROR") {
        console.error("Search worker error:", message.payload.message);
        setIsSearching(false);
      }
    };
    worker.onerror = (error) => {
      console.error("Search worker crashed:", error);
      setIsSearching(false);
    };
    const requestId = requestIdRef;
    const snapshot = snapshotRef;
    return () => {
      requestId.current++;
      worker.terminate();
      workerRef.current = null;
      snapshot.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!ready || !workerRef.current) return;
    const worker = workerRef.current;
    const next = new Map<string, string>();
    for (const bookmark of allBookmarks) {
      const signature = JSON.stringify(bookmark);
      next.set(bookmark.id, signature);
      if (snapshotRef.current.get(bookmark.id) !== signature) {
        worker.postMessage({ type: "UPSERT", payload: bookmark } satisfies WorkerIncomingMessage);
      }
    }
    for (const id of snapshotRef.current.keys()) {
      if (!next.has(id)) worker.postMessage({ type: "DELETE", payload: { id } } satisfies WorkerIncomingMessage);
    }
    snapshotRef.current = next;

    const requestId = ++requestIdRef.current;
    if (!hasSearch) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSearching(true);
    const timeout = setTimeout(() => {
      worker.postMessage({
        type: "SEARCH",
        payload: { requestId, query: searchTerm, filterRead, filterTagIds: JSON.parse(filterTagIdsKey) as string[] },
      } satisfies WorkerIncomingMessage);
    }, searchTerm.trim() ? 150 : 0);
    return () => clearTimeout(timeout);
  }, [ready, allBookmarks, searchTerm, filterRead, filterTagIdsKey, hasSearch]);

  const results = useMemo(() => {
    if (!hasSearch) return allBookmarks;
    const byId = new Map(allBookmarks.map((bookmark) => [bookmark.id, bookmark]));
    return resultIds.map((id) => byId.get(id)).filter((bookmark): bookmark is Bookmark => bookmark !== undefined);
  }, [allBookmarks, resultIds, hasSearch]);

  return { results, isSearching: hasSearch && (!ready || isSearching) };
};

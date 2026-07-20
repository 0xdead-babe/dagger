import { Document } from "flexsearch";
import type {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
} from "../types/worker";
import type { Bookmark } from "../types/entities";

type IndexableBookmark = Bookmark & Record<string, any>;

const index = new Document<IndexableBookmark>({
  document: {
    id: "id",
    index: [
      { field: "title", tokenize: "full", resolution: 9 },
      { field: "url", tokenize: "full", resolution: 5 },
      { field: "description", tokenize: "full", resolution: 3 },
    ],
  },
  cache: true,
});

const storedBookmarks = new Map<string, Bookmark>();

self.postMessage({ type: "READY" } as WorkerOutgoingMessage);

self.onmessage = async (event: MessageEvent<WorkerIncomingMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case "INIT": {
        storedBookmarks.forEach((_, id) => index.remove(id));
        storedBookmarks.clear();

        message.payload.forEach((bookmark) => {
          index.add(bookmark as IndexableBookmark);
          storedBookmarks.set(bookmark.id, bookmark);
        });
        break;
      }

      case "UPSERT": {
        const bookmark = message.payload;
        if (storedBookmarks.has(bookmark.id)) {
          index.update(bookmark as IndexableBookmark);
        } else {
          index.add(bookmark as IndexableBookmark);
        }
        storedBookmarks.set(bookmark.id, bookmark);
        break;
      }

      case "DELETE": {
        const { id } = message.payload;
        index.remove(id);
        storedBookmarks.delete(id);
        break;
      }

      case "SEARCH": {
        const { query, filterRead, filterTagIds } = message.payload;

        let candidateIds: string[];

        if (query.trim()) {
          const searchOutput = await index.searchAsync(query, {
            limit: 100,
            enrich: false,
          });

          const idSet = new Set<string>();
          searchOutput.forEach((fieldResult) => {
            fieldResult.result.forEach((id) => idSet.add(id as string));
          });
          candidateIds = Array.from(idSet);
        } else {
          candidateIds = Array.from(storedBookmarks.keys());
        }

        const hasReadFilter = filterRead !== undefined;
        const hasTagFilter =
          filterTagIds !== undefined && filterTagIds.length > 0;

        const filteredIds = candidateIds.filter((id) => {
          const bookmark = storedBookmarks.get(id);
          if (!bookmark) return false;
          if (hasReadFilter && bookmark.read !== filterRead) return false;
          if (
            hasTagFilter &&
            !filterTagIds!.every((tid) => bookmark.tagIds.includes(tid))
          )
            return false;
          return true;
        });

        self.postMessage({
          type: "SEARCH_RESULTS",
          payload: { ids: filteredIds },
        } as WorkerOutgoingMessage);
        break;
      }

      default: {
        const _exhaustive: never = message;
        console.warn(
          "Search worker received unknown message type",
          _exhaustive,
        );
      }
    }
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      payload: {
        message:
          error instanceof Error
            ? error.message
            : "Unknown search worker error",
      },
    } as WorkerOutgoingMessage);
  }
};

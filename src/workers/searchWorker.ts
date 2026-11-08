import { Document } from "flexsearch";
import type {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
} from "../types/worker";
import type { Bookmark } from "../types/entities";

type SearchDocument = Record<string, string> & Pick<Bookmark, "id" | "title" | "url"> & { description: string };

const toSearchDocument = (bookmark: Bookmark): SearchDocument => ({
  id: bookmark.id,
  title: typeof bookmark.title === "string" ? bookmark.title : "",
  url: typeof bookmark.url === "string" ? bookmark.url : "",
  description: typeof bookmark.description === "string" ? bookmark.description : "",
});

const index = new Document<SearchDocument>({
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
          index.add(toSearchDocument(bookmark));
          storedBookmarks.set(bookmark.id, bookmark);
        });
        break;
      }

      case "UPSERT": {
        const bookmark = message.payload;
        if (storedBookmarks.has(bookmark.id)) {
          index.update(toSearchDocument(bookmark));
        } else {
          index.add(toSearchDocument(bookmark));
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
        const { requestId, query, filterRead, filterTagIds } = message.payload;

        let candidateIds: string[];

        if (query.trim()) {
          const searchOutput = await index.searchAsync(query, {
            limit: storedBookmarks.size,
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
          if (hasReadFilter && Boolean(bookmark.read) !== filterRead) return false;
          if (
            hasTagFilter &&
            !filterTagIds!.every((tid) => bookmark.tagIds?.includes(tid))
          )
            return false;
          return true;
        });

        self.postMessage({
          type: "SEARCH_RESULTS",
          payload: { requestId, ids: filteredIds },
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

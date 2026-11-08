import { type Bookmark } from "./entities";

export type WorkerIncomingMessage =
  | { type: "INIT"; payload: Bookmark[] }
  | { type: "UPSERT"; payload: Bookmark }
  | { type: "DELETE"; payload: { id: string } }
  | {
      type: "SEARCH";
      payload: { requestId: number; query: string; filterRead?: boolean; filterTagIds?: string[] };
    };

export type WorkerOutgoingMessage =
  | { type: "READY" }
  | { type: "SEARCH_RESULTS"; payload: { requestId: number; ids: string[] } }
  | { type: "ERROR"; payload: { message: string } };

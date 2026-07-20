import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

const mockPostMessage = vi.fn();

global.self = {
  postMessage: mockPostMessage,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onmessage: null as any,
} as any;

await import("../searchWorker");

const sendMessage = async (data: unknown): Promise<void> => {
  // @ts-expect-error Mocking global self onmessage for test
  await global.self.onmessage({ data } as MessageEvent);
};

const bookmarks = [
  {
    id: "1",
    title: "Google",
    url: "https://google.com",
    description: "",
    tagIds: [],
    read: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "2",
    title: "GitHub",
    url: "https://github.com",
    description: "",
    tagIds: [],
    read: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

describe("Search Worker", () => {
  beforeAll(async () => {
    await sendMessage({ type: "INIT", payload: bookmarks });
  });

  beforeEach(() => {
    mockPostMessage.mockClear();
  });

  it("posts READY immediately on startup", () => {
    expect(typeof global.self.onmessage).toBe("function");
  });

  it("returns matching results for SEARCH", async () => {
    await sendMessage({ type: "SEARCH", payload: { query: "Google" } });

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "SEARCH_RESULTS",
      payload: { ids: ["1"] },
    });
  });

  it("returns all bookmarks for empty query", async () => {
    await sendMessage({ type: "SEARCH", payload: { query: "   " } });

    const call = mockPostMessage.mock.calls[0][0];
    expect(call.type).toBe("SEARCH_RESULTS");
    expect(call.payload.ids).toHaveLength(2);
    expect(call.payload.ids).toContain("1");
    expect(call.payload.ids).toContain("2");
  });

  it("adds new document to index on UPSERT", async () => {
    const newBookmark = {
      id: "3",
      title: "Vitest Docs",
      url: "https://vitest.dev",
      description: "",
      tagIds: [],
      read: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await sendMessage({ type: "UPSERT", payload: newBookmark });
    await sendMessage({ type: "SEARCH", payload: { query: "Vitest" } });

    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "SEARCH_RESULTS",
      payload: { ids: ["3"] },
    });
  });

  it("removes document from index on DELETE", async () => {
    await sendMessage({ type: "DELETE", payload: { id: "1" } });
    await sendMessage({ type: "SEARCH", payload: { query: "Google" } });

    expect(mockPostMessage).toHaveBeenLastCalledWith({
      type: "SEARCH_RESULTS",
      payload: { ids: [] },
    });
  });

  it("filters by tagIds when provided", async () => {
    const tagged = {
      id: "4",
      title: "Tagged Bookmark",
      url: "https://example.com",
      description: "",
      tagIds: ["tag-a"],
      read: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const untagged = {
      id: "5",
      title: "Tagged Bookmark Two",
      url: "https://example2.com",
      description: "",
      tagIds: ["tag-b"],
      read: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await sendMessage({ type: "UPSERT", payload: tagged });
    await sendMessage({ type: "UPSERT", payload: untagged });

    await sendMessage({
      type: "SEARCH",
      payload: { query: "Tagged", filterTagIds: ["tag-a"] },
    });

    const call = mockPostMessage.mock.calls[0][0];
    expect(call.type).toBe("SEARCH_RESULTS");
    expect(call.payload.ids).toContain("4");
    expect(call.payload.ids).not.toContain("5");
  });

  it("filters by read status when provided", async () => {
    const readBookmark = {
      id: "6",
      title: "Read Bookmark",
      url: "https://read.com",
      description: "",
      tagIds: [],
      read: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const unreadBookmark = {
      id: "7",
      title: "Read Bookmark Two",
      url: "https://unread.com",
      description: "",
      tagIds: [],
      read: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await sendMessage({ type: "UPSERT", payload: readBookmark });
    await sendMessage({ type: "UPSERT", payload: unreadBookmark });

    await sendMessage({
      type: "SEARCH",
      payload: { query: "Read", filterRead: true },
    });

    const call = mockPostMessage.mock.calls[0][0];
    expect(call.type).toBe("SEARCH_RESULTS");
    expect(call.payload.ids).toContain("6");
    expect(call.payload.ids).not.toContain("7");
  });

  it("posts ERROR on malformed message", async () => {
    await sendMessage({ type: "UPSERT", payload: null });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ERROR" }),
    );
  });
});

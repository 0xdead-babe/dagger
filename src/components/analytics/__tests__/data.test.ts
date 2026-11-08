import { describe, expect, it } from "vitest";
import type { Bookmark, Tag } from "@/types/entities";
import { getActivityWeeks, getTopDomains, getTopTags } from "../data";

function bookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: "b",
    url: "https://example.com",
    title: "Example",
    tagIds: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function tag(id: string, name = id): Tag {
  return { id, name, createdAt: 0 };
}

describe("analytics data", () => {
  it("buckets 12 local calendar weeks across year boundaries and excludes future or older dates", () => {
    const now = new Date(2025, 0, 6, 10);
    const weeks = getActivityWeeks([
      bookmark({ createdAt: new Date(2025, 0, 6, 0).getTime() }),
      bookmark({ createdAt: new Date(2025, 0, 5, 23, 59).getTime() }),
      bookmark({ createdAt: new Date(2024, 9, 21).getTime() }),
      bookmark({ createdAt: new Date(2024, 9, 20, 23, 59).getTime() }),
      bookmark({ createdAt: new Date(2025, 0, 6, 11).getTime() }),
      bookmark({ createdAt: Number.NaN }),
    ], now);

    expect(weeks).toHaveLength(12);
    expect(weeks[0].start).toEqual(new Date(2024, 9, 21));
    expect(weeks[0].count).toBe(1);
    expect(weeks[10].count).toBe(1);
    expect(weeks[11]).toMatchObject({ count: 1, isCurrent: true });
  });

  it("counts valid web hostnames and sorts equal counts consistently", () => {
    const domains = getTopDomains([
      bookmark({ url: "https://b.example/path" }),
      bookmark({ url: "https://a.example:8080/path" }),
      bookmark({ url: "HTTP://B.EXAMPLE/other" }),
      bookmark({ url: "mailto:test@example.com" }),
      bookmark({ url: "not a url" }),
    ]);
    expect(domains).toEqual([
      { hostname: "b.example", count: 2 },
      { hostname: "a.example", count: 1 },
    ]);
  });

  it("ignores orphan and repeated tag IDs before ranking valid tags", () => {
    const ranked = getTopTags([
      bookmark({ tagIds: ["orphan", "orphan", "z", "z", "a"] }),
      bookmark({ tagIds: ["a"] }),
    ], [tag("z", "Zed"), tag("a", "Alpha")]);
    expect(ranked).toEqual([
      { tag: tag("a", "Alpha"), count: 2 },
      { tag: tag("z", "Zed"), count: 1 },
    ]);
  });
});

import type { Bookmark, Tag } from "@/types/entities";

export interface ActivityWeek {
  start: Date;
  count: number;
  isCurrent: boolean;
}

function mondayOf(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

export function getActivityWeeks(bookmarks: Bookmark[], now = new Date()): ActivityWeek[] {
  const currentMonday = mondayOf(now);
  const weeks = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - (11 - index) * 7);
    return { start, count: 0, isCurrent: index === 11 };
  });
  const byStart = new Map(weeks.map((week) => [week.start.getTime(), week]));

  for (const bookmark of bookmarks) {
    if (!Number.isFinite(bookmark.createdAt) || bookmark.createdAt > now.getTime()) continue;
    const created = new Date(bookmark.createdAt);
    if (Number.isNaN(created.getTime())) continue;
    const week = byStart.get(mondayOf(created).getTime());
    if (week) week.count++;
  }

  return weeks;
}

export function getTopDomains(bookmarks: Bookmark[], limit = 5) {
  const counts = new Map<string, number>();
  for (const bookmark of bookmarks) {
    try {
      const url = new URL(bookmark.url);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) continue;
      counts.set(url.hostname, (counts.get(url.hostname) ?? 0) + 1);
    } catch {
      continue;
    }
  }
  return [...counts].sort(([nameA, countA], [nameB, countB]) =>
    countB - countA || nameA.localeCompare(nameB)
  ).slice(0, limit).map(([hostname, count]) => ({ hostname, count }));
}

export function getTopTags(bookmarks: Bookmark[], tags: Tag[], limit = 8) {
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const counts = new Map<string, number>();
  for (const bookmark of bookmarks) {
    for (const id of new Set(bookmark.tagIds ?? [])) {
      if (byId.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts].map(([id, count]) => ({ tag: byId.get(id)!, count }))
    .sort((a, b) => b.count - a.count || String(a.tag.name ?? "").localeCompare(String(b.tag.name ?? "")) || a.tag.id.localeCompare(b.tag.id))
    .slice(0, limit);
}

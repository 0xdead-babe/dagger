import { useMemo } from "react";
import type { Bookmark, Tag } from "@/types/entities";
import { getTopTags } from "./data";

interface TagDistributionCardProps {
  bookmarks: Bookmark[];
  tags: Tag[];
}

export default function TagDistributionCard({ bookmarks, tags }: TagDistributionCardProps) {
  const topTags = useMemo(() => getTopTags(bookmarks, tags), [bookmarks, tags]);
  const maxCount = topTags[0]?.count ?? 0;

  return (
    <div className="card">
      {topTags.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-text-secondary">
          No tagged bookmarks yet
        </div>
      ) : (
        topTags.map(({ tag, count }) => {
          const color = tag.color || "#E2622E";
          return (
            <div key={tag.id} className="px-4 py-2.5 border-b border-border last:border-b-0">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-[8px] h-[8px] rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="text-[13px] text-text-primary flex-1 truncate">
                  {tag.name}
                </div>
                <div className="text-[11px] text-text-secondary shrink-0">
                  {count} bookmark{count !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="h-[3px] bg-border rounded-full mt-1.5 ml-[20px]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

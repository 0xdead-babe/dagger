import { useMemo } from "react";
import type { Bookmark, Tag } from "@/types/entities";

interface TagDistributionCardProps {
  bookmarks: Bookmark[];
  tags: Tag[];
}

export default function TagDistributionCard({ bookmarks, tags }: TagDistributionCardProps) {
  const { maxCount, topTags } = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    for (const b of bookmarks) {
      if (b.tagIds) {
        for (const tid of b.tagIds) {
          tagCounts[tid] = (tagCounts[tid] || 0) + 1;
        }
      }
    }
    
    const sorted = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tagId, count]) => {
        const tag = tags.find((t) => t.id === tagId);
        return { tag, count };
      })
      .filter((t) => t.tag !== undefined && t.count > 0);
      
    const max = sorted.length > 0 ? sorted[0].count : 0;
    
    return { maxCount: max, topTags: sorted };
  }, [bookmarks, tags]);

  return (
    <div className="card">
      {topTags.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-text-secondary">
          No tagged bookmarks yet
        </div>
      ) : (
        topTags.map(({ tag, count }) => {
          const color = tag?.color || '#E2622E';
          return (
            <div key={tag!.id} className="px-4 py-2.5 border-b border-[#241F19] last:border-b-0">
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-[8px] h-[8px] rounded-full shrink-0" 
                  style={{ backgroundColor: color }}
                />
                <div className="text-[13px] text-text-primary flex-1 truncate">
                  {tag!.name}
                </div>
                <div className="text-[11px] text-text-secondary shrink-0">
                  {count} bookmark{count !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="h-[3px] bg-[#241F19] rounded-full mt-1.5 ml-[20px]">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

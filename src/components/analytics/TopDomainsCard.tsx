import { useMemo } from "react";
import type { Bookmark } from "@/types/entities";

interface TopDomainsCardProps {
  bookmarks: Bookmark[];
}

export default function TopDomainsCard({ bookmarks }: TopDomainsCardProps) {
  const { maxCount, topDomains } = useMemo(() => {
    const domainCounts: Record<string, number> = {};
    for (const b of bookmarks) {
      try {
        const url = new URL(b.url);
        domainCounts[url.hostname] = (domainCounts[url.hostname] || 0) + 1;
      } catch {
        // Ignore invalid URLs
      }
    }
    
    const sorted = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hostname, count]) => ({ hostname, count }));
      
    const max = sorted.length > 0 ? sorted[0].count : 0;
    
    return { maxCount: max, topDomains: sorted };
  }, [bookmarks]);

  return (
    <div className="card">
      {topDomains.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-text-secondary">
          No bookmarks yet
        </div>
      ) : (
        topDomains.map((domain, index) => (
          <div key={domain.hostname} className="px-4 py-2.5 border-b border-[#241F19] last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="text-[10.5px] text-[#6E6455] w-[14px] shrink-0 text-right">
                {index + 1}
              </div>
              <div className="text-[13px] text-text-primary flex-1 truncate">
                {domain.hostname}
              </div>
              <div className="text-[11px] text-text-secondary shrink-0">
                {domain.count}
              </div>
            </div>
            <div className="h-[3px] bg-[#241F19] rounded-full mt-1.5 mx-[14px] ml-[26px]">
              <div 
                className="h-full rounded-full bg-accent/60 transition-all duration-500"
                style={{ width: `${maxCount > 0 ? (domain.count / maxCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

import { useMemo } from "react";
import type { Bookmark } from "@/types/entities";
import { getTopDomains } from "./data";

interface TopDomainsCardProps {
  bookmarks: Bookmark[];
}

export default function TopDomainsCard({ bookmarks }: TopDomainsCardProps) {
  const topDomains = useMemo(() => getTopDomains(bookmarks), [bookmarks]);
  const maxCount = topDomains[0]?.count ?? 0;

  return (
    <div className="card">
      {topDomains.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-text-secondary">
          No web bookmarks yet
        </div>
      ) : (
        topDomains.map((domain, index) => (
          <div key={domain.hostname} className="px-4 py-2.5 border-b border-border last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="text-[10.5px] text-text-secondary w-[14px] shrink-0 text-right">
                {index + 1}
              </div>
              <div className="text-[13px] text-text-primary flex-1 truncate">
                {domain.hostname}
              </div>
              <div className="text-[11px] text-text-secondary shrink-0">
                {domain.count}
              </div>
            </div>
            <div className="h-[3px] bg-border rounded-full mt-1.5 mx-[14px] ml-[26px]">
              <div
                className="h-full rounded-full bg-accent/60 transition-all duration-500"
                style={{ width: `${(domain.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

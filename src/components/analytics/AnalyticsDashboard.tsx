import { useMemo } from "react";
import { BookOpen, EyeOff, Eye, Pin } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useTags } from "@/hooks/useTags";
import StatCard from "./StatCard";
import ActivityTimeline from "./ActivityTimeline";
import TopDomainsCard from "./TopDomainsCard";
import TagDistributionCard from "./TagDistributionCard";

export default function AnalyticsDashboard() {
  const { bookmarks, isLoading: bookmarksLoading } = useBookmarks();
  const { tags, isLoading: tagsLoading } = useTags();

  const { totalCount, unreadCount, pinnedCount, readCount } = useMemo(() => {
    let unread = 0;
    let pinned = 0;
    let read = 0;

    for (const b of bookmarks) {
      if (b.read) read++;
      else unread++;

      if (b.pinned) pinned++;
    }

    return {
      totalCount: bookmarks.length,
      unreadCount: unread,
      pinnedCount: pinned,
      readCount: read
    };
  }, [bookmarks]);

  if (bookmarksLoading || tagsLoading) {
    return (
      <div className="flex flex-col gap-5 p-2">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="card h-[80px] animate-pulse bg-surface-raised" />
          <div className="card h-[80px] animate-pulse bg-surface-raised" />
          <div className="card h-[80px] animate-pulse bg-surface-raised" />
          <div className="card h-[80px] animate-pulse bg-surface-raised" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-4">
      <div className="mt-2 mb-2">
        <h1 className="text-[19px] font-semibold text-text-primary">Analytics</h1>
        <div className="text-[12px] text-text-secondary mt-1 tracking-wide">
          {totalCount} bookmarks &middot; {tags.length} tags
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-4">
        <StatCard
          icon={BookOpen}
          label="Total Bookmarks"
          value={totalCount}
        />
        <StatCard
          icon={EyeOff}
          label="Unread"
          value={unreadCount}
          accentValue
        />
        <StatCard
          icon={Pin}
          label="Pinned"
          value={pinnedCount}
        />
        <StatCard
          icon={Eye}
          label="Read"
          value={readCount}
        />
      </div>

      <div className="mt-5">
        <div className="section-label mb-2">Activity &middot; Last 12 Weeks</div>
        <ActivityTimeline bookmarks={bookmarks} />
      </div>

      <div className="mt-5">
        <div className="section-label mb-2">Top Domains</div>
        <TopDomainsCard bookmarks={bookmarks} />
      </div>

      <div className="mt-5 mb-4">
        <div className="section-label mb-2">Tag Usage</div>
        <TagDistributionCard bookmarks={bookmarks} tags={tags} />
      </div>
    </div>
  );
}

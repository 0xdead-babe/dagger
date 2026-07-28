import { useMemo } from "react";
import type { Bookmark } from "@/types/entities";

interface ActivityTimelineProps {
  bookmarks: Bookmark[];
}

export default function ActivityTimeline({ bookmarks }: ActivityTimelineProps) {
  const { maxCount, weeks } = useMemo(() => {
    // 12 weeks including current week
    const WEEKS_COUNT = 12;
    const now = new Date();
    
    // Find most recent Monday 00:00:00 UTC
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day; 
    const currentWeekMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));
    
    const weeksData = [];
    let max = 0;
    
    for (let i = WEEKS_COUNT - 1; i >= 0; i--) {
      const weekStart = new Date(currentWeekMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const count = bookmarks.filter(b => b.createdAt >= weekStart.getTime() && b.createdAt < weekEnd.getTime()).length;
      if (count > max) max = count;
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dateStr = `${monthNames[weekStart.getUTCMonth()]} ${weekStart.getUTCDate()}`;
      
      weeksData.push({
        count,
        dateStr,
        isCurrent: i === 0,
      });
    }
    
    return { maxCount: max, weeks: weeksData };
  }, [bookmarks]);

  return (
    <div className="card px-4 py-3.5">
      <div className="flex items-end gap-[3px] h-[60px]">
        {weeks.map((week, idx) => {
          const height = maxCount > 0 ? Math.max(2, (week.count / maxCount) * 100) : 2;
          return (
            <div
              key={idx}
              title={`Week of ${week.dateStr}: ${week.count} bookmarks`}
              className={`flex-1 rounded-t-[3px] transition-all duration-300 hover:bg-accent/80 ${week.isCurrent ? 'bg-accent' : 'bg-[#3A2F22]'}`}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <div className="text-[10px] text-[#6E6455]">12w ago</div>
        <div className="text-[10px] text-[#6E6455]">This week</div>
      </div>
    </div>
  );
}

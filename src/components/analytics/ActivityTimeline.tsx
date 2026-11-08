import { useEffect, useState } from "react";
import type { Bookmark } from "@/types/entities";
import { getActivityWeeks } from "./data";

interface ActivityTimelineProps {
  bookmarks: Bookmark[];
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function ActivityTimeline({ bookmarks }: ActivityTimelineProps) {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const nextMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const timer = window.setTimeout(() => setToday(new Date()), Math.max(0, nextMidnight.getTime() - Date.now()));
    return () => window.clearTimeout(timer);
  }, [today]);

  const weeks = getActivityWeeks(bookmarks);
  const maxCount = Math.max(0, ...weeks.map((week) => week.count));

  return (
    <div className="card px-4 py-3.5">
      <div className="flex items-end gap-[3px] h-[60px]">
        {weeks.map((week) => {
          const label = `Week of ${dateFormat.format(week.start)}: ${week.count} bookmark${week.count === 1 ? "" : "s"}`;
          return (
            <div
              key={week.start.getTime()}
              role="img"
              aria-label={label}
              title={label}
              className={`flex-1 rounded-t-[3px] transition-all duration-300 hover:bg-accent/80 ${week.isCurrent ? "bg-accent" : "bg-border"}`}
              style={{ height: `${week.count && maxCount ? Math.max(3, (week.count / maxCount) * 100) : 3}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-text-secondary">
        <span>11 weeks ago</span>
        <span>This week</span>
      </div>
    </div>
  );
}

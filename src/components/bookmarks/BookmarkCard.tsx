import type { Bookmark } from "@/types/entities";
import { Pencil, Trash2, Pin } from "lucide-react";
import { isSafeBookmarkUrl } from "@/utils/url";

interface BookmarkCardProps {
  bookmark: Bookmark;
  isLast?: boolean;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  getTagName: (tagId: string) => string | undefined;
}

export function BookmarkCard({
  bookmark,
  isLast,
  onEdit,
  onDelete,
  onTogglePin,
  getTagName,
}: BookmarkCardProps) {
  const handleOpen = () => {
    if (isSafeBookmarkUrl(bookmark.url)) window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  let hostname = "";
  try {
    hostname = new URL(bookmark.url).hostname;
  } catch {
    hostname = bookmark.url;
  }

  return (
    <div className={`list-row ${!isLast ? 'list-row-separator' : ''}`}>
      <button type="button" onClick={handleOpen} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left" aria-label={`Open ${bookmark.title || hostname}`}>
      {bookmark.favicon ? (
        <img
          src={bookmark.favicon}
          alt=""
          className="size-7 shrink-0 rounded-lg bg-surface-raised object-contain"
        />
      ) : (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised">
          <span className="text-[11px] font-semibold text-text-secondary">{hostname.charAt(0).toUpperCase()}</span>
        </div>
      )}

      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[13.5px] font-medium text-text-primary">
          {bookmark.pinned && (
            <Pin size={11} className="shrink-0 fill-current text-accent-text" />
          )}
          <span className="truncate">{bookmark.title || hostname}</span>
          {!bookmark.read && (
            <span className="size-1.5 shrink-0 rounded-full bg-accent" title="Unread"></span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-text-secondary">
          <span className="truncate max-w-[120px]">{hostname}</span>
          {bookmark.tagIds?.map((tagId) => {
            const name = getTagName(tagId);
            return name ? <span key={tagId} className="tag-pill truncate max-w-[60px]">{name}</span> : null;
          })}
        </div>
      </div>
      </button>

      <div className="row-actions">
        {onTogglePin && (
          <button
            type="button"
            onClick={() => onTogglePin(bookmark.id, !bookmark.pinned)}
            className={`action-icon-btn ${bookmark.pinned ? '!text-accent-text !bg-accent-subtle' : ''}`}
            title={bookmark.pinned ? "Unpin" : "Pin"}
            aria-label={bookmark.pinned ? `Unpin ${bookmark.title || hostname}` : `Pin ${bookmark.title || hostname}`}
          >
            <Pin size={14} className={bookmark.pinned ? "fill-current" : ""} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(bookmark)}
          className="action-icon-btn"
          title="Edit"
          aria-label={`Edit ${bookmark.title || hostname}`}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(bookmark.id)}
          className="action-icon-btn hover:!text-red-400"
          title="Move to Trash"
          aria-label={`Move ${bookmark.title || hostname} to Trash`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

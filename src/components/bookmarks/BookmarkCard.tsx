import type { Bookmark } from "@/types/entities";
import { Pencil, Trash2, Pin } from "lucide-react";

interface BookmarkCardProps {
  bookmark: Bookmark;
  isLast?: boolean;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (id: string, pinned: boolean) => void;
  getTagName: (tagId: string) => string;
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
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  let hostname = "";
  try {
    hostname = new URL(bookmark.url).hostname;
  } catch {
    // ignore
    hostname = bookmark.url;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      className={`group flex items-center gap-[11px] px-4 py-3 hover:bg-[#201B14] cursor-pointer transition-colors ${!isLast ? 'border-b border-[#241F19]' : ''}`}
    >
      {bookmark.favicon ? (
        <img
          src={bookmark.favicon}
          alt=""
          className="w-6 h-6 rounded-md shrink-0 bg-[#2A241C]"
        />
      ) : (
        <div className="w-6 h-6 rounded-md bg-[#2A241C] flex items-center justify-center shrink-0">
          <span className="text-[10px] text-text-secondary">{hostname.charAt(0).toUpperCase()}</span>
        </div>
      )}

      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="text-[13px] text-text-primary whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1.5">
          {bookmark.pinned && (
            <Pin size={10} className="text-accent-text shrink-0 fill-current" />
          )}
          {bookmark.title || hostname}
          {!bookmark.read && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" title="Unread"></span>
          )}
        </div>
        <div className="text-[11px] text-text-secondary flex flex-wrap gap-1.5 items-center mt-0.5">
          <span className="truncate max-w-[120px]">{hostname}</span>
          {bookmark.tagIds?.map((tagId) => (
            <span
              key={tagId}
              className="tag-pill truncate max-w-[60px]"
            >
              {getTagName(tagId)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 ml-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(bookmark.id, !bookmark.pinned);
            }}
            className={`w-[22px] h-[22px] rounded-[5px] flex items-center justify-center transition-colors ${bookmark.pinned ? 'text-accent-text bg-accent-subtle' : 'text-[#9C9184] hover:bg-[#2A241C] hover:text-text-primary'}`}
            title={bookmark.pinned ? "Unpin" : "Pin"}
          >
            <Pin size={11} className={bookmark.pinned ? "fill-current" : ""} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(bookmark);
          }}
          className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[#9C9184] hover:bg-[#2A241C] hover:text-text-primary transition-colors"
          title="Edit"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(bookmark.id);
          }}
          className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[#9C9184] hover:bg-[#2A241C] hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

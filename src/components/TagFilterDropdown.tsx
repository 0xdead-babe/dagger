import { useState, useMemo, useEffect, useRef } from "react";
import { useTags } from "@/hooks/useTags";

interface TagFilterDropdownProps {
  onClose: () => void;
  selectedTagIds: string[];
  onApply: (selectedTagIds: string[]) => void;
}

function TagFilterDropdown({
  onClose,
  selectedTagIds,
  onApply,
}: TagFilterDropdownProps) {
  const { tags } = useTags();
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelectedTagIds, setLocalSelectedTagIds] = useState<string[]>(selectedTagIds);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const filteredTags = useMemo(() => {
    if (!tags) return [];
    return tags.filter((tag) =>
      typeof tag.name === "string" && tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tags, searchTerm]);

  const handleTagToggle = (tagId: string) => {
    setLocalSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const handleApply = () => {
    onApply(localSelectedTagIds);
    onClose();
  };

  const handleClear = () => {
    setLocalSelectedTagIds([]);
  };

  return (
    <div
      ref={wrapperRef}
      className="absolute left-0 top-[110%] z-50 w-[245px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
    >
      <div className="border-b border-border/70 p-2.5">
        <input
          type="text"
          placeholder="Search tags…"
          aria-label="Search tags"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="field-input !min-h-[36px] !py-1.5 !text-[12px]"
          autoFocus
        />
      </div>
      <div className="max-h-[210px] overflow-y-auto p-1.5 custom-scrollbar">
        {filteredTags.map((tag) => {
          const isSelected = localSelectedTagIds.includes(tag.id!);
          return (
            <button
              type="button"
              key={tag.id}
              onClick={() => handleTagToggle(tag.id)}
              aria-pressed={isSelected}
              className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left text-[12px] text-text-primary transition-colors hover:bg-surface-raised"
            >
              <div className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${isSelected ? 'border-accent bg-accent text-white' : 'border-border bg-transparent'}`}>
                {isSelected && <span className="text-[10px] font-bold">&#10003;</span>}
              </div>
              <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: tag.color || "#E2622E" }}></span>
              <span className="truncate">{tag.name}</span>
            </button>
          );
        })}
        {filteredTags.length === 0 && (
          <div className="p-2 text-center text-[12px] text-text-muted">No tags found</div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border/70 px-3 py-2.5">
        <button
          onClick={handleClear}
          className="text-[12px] text-text-secondary transition-colors hover:text-text-primary"
        >
          Clear
        </button>
        <button
          onClick={handleApply}
          className="add-btn !px-3 !py-1.5 !text-[12px]"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default TagFilterDropdown;

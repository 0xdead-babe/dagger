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
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
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
      className="absolute top-[110%] left-0 w-[230px] bg-[#1D1912] border border-[#322B22] rounded-[10px] shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
    >
      <div className="p-2.5 border-b border-[#241F19]">
        <input
          type="text"
          placeholder="Search tags…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#201B14] border border-[#2E2820] rounded-[6px] px-2 py-1.5 text-[11.5px] text-[#EFE7DA] placeholder-[#6E6455] focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          autoFocus
        />
      </div>
      <div className="max-h-[186px] overflow-y-auto p-1.5 custom-scrollbar">
        {filteredTags.map((tag) => {
          const isSelected = localSelectedTagIds.includes(tag.id!);
          return (
            <label
              key={tag.id}
              onClick={(e) => { e.preventDefault(); handleTagToggle(tag.id!); }}
              className="flex items-center gap-2 p-1.5 rounded-[6px] text-[11.5px] text-[#EFE7DA] hover:bg-[#201B14] cursor-pointer transition-colors"
            >
              <div className={`w-[13px] h-[13px] rounded-[3px] border flex shrink-0 items-center justify-center transition-colors ${isSelected ? 'bg-[#E2622E] border-[#E2622E] text-[#FCEEE6]' : 'border-[#4A4236] bg-transparent'}`}>
                {isSelected && <span className="text-[9px] font-bold">&#10003;</span>}
              </div>
              <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ background: tag.color }}></span>
              <span className="truncate">{tag.name}</span>
            </label>
          );
        })}
        {filteredTags.length === 0 && (
          <div className="p-2 text-[11px] text-[#6E6455] text-center">No tags found</div>
        )}
      </div>
      <div className="flex justify-between items-center px-2.5 py-[9px] border-t border-[#241F19]">
        <button
          onClick={handleClear}
          className="text-[11px] text-[#9C9184] hover:text-[#EFE7DA] transition-colors"
        >
          Clear
        </button>
        <button
          onClick={handleApply}
          className="bg-[#E2622E] text-[#FCEEE6] border-none rounded-[6px] px-[11px] py-[5px] text-[11px] font-medium transition-opacity hover:opacity-90"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default TagFilterDropdown;

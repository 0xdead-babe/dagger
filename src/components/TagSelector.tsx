import { useState, useRef, useEffect } from "react";
import { useTags } from "@/hooks/useTags";
import { X } from "lucide-react";

interface TagSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TagSelector({ value, onChange }: TagSelectorProps) {
  const { tags, addTag } = useTags();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const selectedTags = tags.filter(t => value.includes(t.id!));
  
  const filteredTags = tags.filter(
    t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) && !value.includes(t.id!)
  );

  const exactMatch = tags.find(t => t.name.toLowerCase() === searchTerm.trim().toLowerCase());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onChange([...value, id]);
    setSearchTerm("");
  };

  const handleRemove = (id: string) => {
    onChange(value.filter(v => v !== id));
  };

  const handleCreate = async () => {
    if (!searchTerm.trim()) return;
    const newId = await addTag(searchTerm.trim());
    onChange([...value, newId]);
    setSearchTerm("");
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="bg-[#201B14] border border-[#2E2820] rounded-[7px] p-2 mb-1.5 flex flex-wrap gap-1.5 items-center">
        {selectedTags.map(tag => (
          <div key={tag.id} className="flex items-center gap-1.5 bg-[#241F19] border border-[#322B22] rounded-full px-2 py-1 text-[11px] text-[#EFE7DA]">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }}></span>
            {tag.name}
            <button 
              type="button"
              onClick={() => handleRemove(tag.id!)}
              className="text-[#6E6455] hover:text-[#EFE7DA] transition-colors ml-0.5"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Type to filter or create a tag…"
          className="flex-1 min-w-[120px] bg-transparent border-none text-[12px] text-[#EFE7DA] placeholder-[#6E6455] focus:outline-none focus:ring-0 px-1 py-0.5"
        />
      </div>

      {isOpen && (searchTerm || filteredTags.length > 0) && (
        <div className="absolute left-0 right-0 z-50 border border-[#2E2820] rounded-[7px] mt-1.5 overflow-hidden bg-[#1D1912] shadow-xl max-h-[160px] flex flex-col">
          <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
            {filteredTags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleSelect(tag.id!)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11.5px] text-[#EFE7DA] hover:bg-[#201B14] rounded-md transition-colors text-left"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tag.color }}></span>
                <span className="truncate">{tag.name}</span>
              </button>
            ))}
            {searchTerm.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11.5px] text-[#F0A57C] font-medium hover:bg-[#201B14] rounded-md transition-colors text-left mt-0.5"
              >
                <span className="font-bold">+</span> Create "{searchTerm}"
              </button>
            )}
            {!searchTerm.trim() && filteredTags.length === 0 && (
              <div className="px-2.5 py-2 text-[11px] text-[#6E6455] text-center">No more tags</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

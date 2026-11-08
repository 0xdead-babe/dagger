import { useState, useRef, useEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useTags } from "@/hooks/useTags";
import { Plus, X } from "lucide-react";

interface TagSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function TagSelector({ value, onChange }: TagSelectorProps) {
  const { tags, addTag } = useTags();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [createError, setCreateError] = useState("");
  const [menuPosition, setMenuPosition] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number } | null>(null);
  const [menuHost, setMenuHost] = useState<Element | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panel = wrapperRef.current?.closest('[data-modal-panel]');
    const host = panel ?? document.body;
    setMenuHost((current) => current === host ? current : host);
    const panelRect = panel?.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 10;
    const above = rect.top - 10;
    const openAbove = below < 190 && above > below;
    setMenuPosition({
      left: panelRect ? rect.left - panelRect.left : Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: Math.min(rect.width, window.innerWidth - 16),
      ...(openAbove
        ? { bottom: panelRect ? panelRect.bottom - rect.top + 6 : window.innerHeight - rect.top + 6 }
        : { top: panelRect ? rect.bottom - panelRect.top + 6 : rect.bottom + 6 }),
      maxHeight: Math.min(190, Math.max(80, openAbove ? above : below)),
    });
  }, []);

  const selectedTags = tags.filter(t => value.includes(t.id));
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredTags = tags.filter(
    t => typeof t.name === "string" && t.name.toLocaleLowerCase().includes(normalizedSearch) && !value.includes(t.id)
  );

  const exactMatch = tags.find(t => typeof t.name === "string" && t.name.toLocaleLowerCase() === normalizedSearch);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [isOpen, updateMenuPosition]);

  const handleSelect = (id: string) => {
    onChange([...value, id]);
    setSearchTerm("");
    setHighlightedIndex(0);
    setCreateError("");
  };

  const handleRemove = (id: string) => {
    onChange(value.filter(v => v !== id));
  };

  const handleCreate = async () => {
    if (!searchTerm.trim()) return;
    try {
      const newId = await addTag(searchTerm.trim());
      onChange([...value, newId]);
      setSearchTerm("");
      setHighlightedIndex(0);
      setCreateError("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not create the tag.");
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (event.key === "ArrowDown" && isOpen) {
      event.preventDefault();
      setHighlightedIndex((index) => Math.min(index + 1, Math.max(0, filteredTags.length - 1)));
    } else if (event.key === "ArrowUp" && isOpen) {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && isOpen && (filteredTags.length > 0 || (normalizedSearch && !exactMatch))) {
      event.preventDefault();
      const selected = filteredTags[Math.min(highlightedIndex, filteredTags.length - 1)];
      if (selected) handleSelect(selected.id);
      else void handleCreate();
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="field-input !py-2 flex flex-wrap items-center gap-1.5">
        {selectedTags.map(tag => (
          <span key={tag.id} className="flex max-w-full items-center gap-1.5 rounded-full border border-border bg-[#382D22] py-1 pl-2.5 pr-1.5 text-[11.5px] text-text-primary">
            <span className="size-2 shrink-0 rounded-full" style={{ background: tag.color || "#E2622E" }}></span>
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemove(tag.id)}
              className="ml-0.5 flex size-5 items-center justify-center rounded-full text-text-secondary hover:bg-surface-raised hover:text-text-primary transition-colors"
              aria-label={`Remove ${tag.name} tag`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id="tag-search"
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
            setCreateError("");
          }}
          onFocus={() => { updateMenuPosition(); setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length ? "Add another tag…" : "Search or create a tag…"}
          className="min-w-[150px] flex-1 bg-transparent px-1 py-0.5 text-[12.5px] text-text-primary placeholder:text-text-muted focus:outline-none"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="tag-options"
          aria-autocomplete="list"
        />
      </div>
      {createError && <p role="alert" className="field-error">{createError}</p>}

      {isOpen && menuPosition && menuHost && (searchTerm || filteredTags.length > 0) && createPortal(
        <div id="tag-options" ref={menuRef} style={menuPosition} className={`${menuHost === document.body ? "fixed" : "absolute"} z-[100] flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_45px_rgba(0,0,0,0.45)]`}>
          <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
            {filteredTags.map((tag, index) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleSelect(tag.id)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12px] text-text-primary transition-colors ${index === highlightedIndex ? "bg-surface-raised" : "hover:bg-surface-raised"}`}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: tag.color || "#E2622E" }}></span>
                <span className="truncate">{tag.name}</span>
              </button>
            ))}
            {searchTerm.trim() && !exactMatch && (
              <button
                type="button"
                onClick={() => void handleCreate()}
                className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-accent-text transition-colors hover:bg-surface-raised"
              >
                <Plus size={14} /> Create “{searchTerm.trim()}”
              </button>
            )}
            {!searchTerm.trim() && filteredTags.length === 0 && (
              <div className="px-3 py-2 text-center text-[12px] text-text-muted">All tags selected</div>
            )}
          </div>
        </div>,
        menuHost,
      )}
    </div>
  );
}

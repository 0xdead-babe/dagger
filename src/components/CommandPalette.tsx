import { useState, useEffect, useRef, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { useTags } from '@/hooks/useTags';
import { useBookmarks } from '@/hooks/useBookmarks';
import { Search, ArrowRight, Pin } from 'lucide-react';
import { isSafeBookmarkUrl } from '@/utils/url';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { bookmarks } = useBookmarks();
  const { results, isSearching } = useSearch(query, undefined, [], bookmarks ?? []);
  const { getTagsByIds } = useTags();

  const slicedResults = useMemo(() => (results || []).slice(0, 8), [results]);
  const activeIndex = Math.min(selectedIndex, Math.max(0, slicedResults.length - 1));

  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOpenUrl = (url: string) => {
    if (!isSafeBookmarkUrl(url)) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, slicedResults.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (slicedResults.length > 0 && slicedResults[activeIndex]) {
        handleOpenUrl(slicedResults[activeIndex].url);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-[#080604]/75 p-4 pt-[16vh] backdrop-blur-[5px] transition-opacity"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#514032] bg-surface shadow-[0_32px_90px_rgba(0,0,0,0.65)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-border/70 px-4 py-3.5">
          <Search className="mr-3 size-5 shrink-0 text-accent-text" />
          <input
            ref={inputRef}
            type="text"
            className="min-w-0 flex-1 border-none bg-transparent text-[16px] text-text-primary placeholder:text-text-muted focus:outline-none"
            placeholder="Search bookmarks..."
            aria-label="Search bookmarks to open"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="kbd ml-3 hidden sm:inline-block">Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 p-6 text-center text-sm text-text-secondary">
              <div className="w-4 h-4 border-2 border-[#9C9184] border-t-transparent rounded-full animate-spin"></div>
              <span>Searching...</span>
            </div>
          ) : !query ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-text-secondary">
              <p>Type to search your bookmarks</p>
              <div className="flex gap-4 mt-2 opacity-70">
                <span className="flex items-center gap-1"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> open</span>
              </div>
            </div>
          ) : slicedResults.length === 0 ? (
            <div className="p-6 text-center text-sm text-text-secondary">No bookmarks found</div>
          ) : (
            <div className="py-2">
              {slicedResults.map((bookmark, index) => {
                const isSelected = index === activeIndex;
                let hostname = '';
                try { hostname = new URL(bookmark.url).hostname; } catch { hostname = bookmark.url; }
                const tags = getTagsByIds ? getTagsByIds(bookmark.tagIds || []) : [];
                const firstLetter = bookmark.title ? bookmark.title.charAt(0).toUpperCase() : '?';

                return (
                  <div
                    key={bookmark.id}
                    className={`group flex cursor-pointer items-center border-b border-border/60 px-4 py-3.5 transition-colors last:border-b-0 ${
                      isSelected ? 'bg-surface-raised' : 'hover:bg-surface-raised'
                    }`}
                    onClick={() => handleOpenUrl(bookmark.url)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="mr-3 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas text-xs font-semibold text-text-secondary">
                      {bookmark.favicon ? (
                        <img src={bookmark.favicon} alt="" className="w-4 h-4" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        firstLetter
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium text-text-primary">{bookmark.title}</span>
                        {bookmark.pinned && <Pin className="w-3 h-3 text-[#E2622E] shrink-0" fill="currentColor" />}
                      </div>
                      <div className="mt-0.5 truncate text-[11.5px] text-text-secondary">{hostname}</div>
                    </div>

                    {tags && tags.length > 0 && (
                      <div className="hidden sm:flex gap-1.5 ml-3 shrink-0 items-center">
                        {tags.map((tag) => (
                          <span key={tag.id} className="tag-pill text-[10px]">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className={`ml-3 text-[#9C9184] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

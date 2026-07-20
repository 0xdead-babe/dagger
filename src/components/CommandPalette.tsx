import { useState, useEffect, useRef, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { useTags } from '@/hooks/useTags';
import { Search, ArrowRight, Pin } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, isSearching } = useSearch(query, undefined, []);
  const { getTagsByIds } = useTags();

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }

  const slicedResults = useMemo(() => (results || []).slice(0, 8), [results]);

  const [prevQuery, setPrevQuery] = useState(query);
  const [prevResultsLen, setPrevResultsLen] = useState(0);

  if (query !== prevQuery || slicedResults.length !== prevResultsLen) {
    setPrevQuery(query);
    setPrevResultsLen(slicedResults.length);
    setSelectedIndex(0);
  }

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
      if (slicedResults.length > 0 && slicedResults[selectedIndex]) {
        handleOpenUrl(slicedResults[selectedIndex].url);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm p-4 transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#1D1912] border border-[#2A241C] rounded-xl shadow-[0_30px_70px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-[#241F19]">
          <Search className="w-5 h-5 text-[#9C9184] mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-[#EFE7DA] placeholder:text-[#9C9184] text-lg"
            placeholder="Search bookmarks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="kbd ml-3 hidden sm:inline-block">Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {isSearching ? (
            <div className="p-6 text-center text-[#9C9184] text-sm flex justify-center items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#9C9184] border-t-transparent rounded-full animate-spin"></div>
              <span>Searching...</span>
            </div>
          ) : !query ? (
            <div className="p-6 text-center text-[#9C9184] text-sm flex flex-col items-center gap-2">
              <p>Type to search your bookmarks</p>
              <div className="flex gap-4 mt-2 opacity-70">
                <span className="flex items-center gap-1"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate</span>
                <span className="flex items-center gap-1"><kbd className="kbd">↵</kbd> open</span>
              </div>
            </div>
          ) : slicedResults.length === 0 ? (
            <div className="p-6 text-center text-[#9C9184] text-sm">No bookmarks found</div>
          ) : (
            <div className="py-2">
              {slicedResults.map((bookmark, index) => {
                const isSelected = index === selectedIndex;
                let hostname = '';
                try { hostname = new URL(bookmark.url).hostname; } catch { hostname = bookmark.url; }
                const tags = getTagsByIds ? getTagsByIds(bookmark.tagIds || []) : [];
                const firstLetter = bookmark.title ? bookmark.title.charAt(0).toUpperCase() : '?';

                return (
                  <div
                    key={bookmark.id}
                    className={`flex items-center px-4 py-3 cursor-pointer group border-b border-[#241F19] last:border-b-0 transition-colors ${
                      isSelected ? 'bg-[#201B14]' : 'hover:bg-[#201B14]'
                    }`}
                    onClick={() => handleOpenUrl(bookmark.url)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="w-8 h-8 rounded bg-[#17140F] border border-[#2E2820] flex items-center justify-center mr-3 shrink-0 text-[#9C9184] text-xs font-medium overflow-hidden">
                      {bookmark.favicon ? (
                        <img src={bookmark.favicon} alt="" className="w-4 h-4" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        firstLetter
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[#EFE7DA] text-sm font-medium truncate">{bookmark.title}</span>
                        {bookmark.pinned && <Pin className="w-3 h-3 text-[#E2622E] shrink-0" fill="currentColor" />}
                      </div>
                      <div className="text-[#9C9184] text-xs truncate mt-0.5">{hostname}</div>
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

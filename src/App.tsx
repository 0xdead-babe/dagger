import { useState, useEffect, useRef } from "react";
import { TagManager } from "@/components/tags/TagManager";
import BookmarkForm from "@/components/BookmarkForm";
import BookmarkList, { type SortOption } from "@/components/BookmarkList";
import ImportExport from "@/components/ImportExport";
import Modal from "@/components/Modal";
import TagFilterDropdown from "@/components/TagFilterDropdown";
import { CommandPalette } from "@/components/CommandPalette";
import { useTags } from "@/hooks/useTags";
import { Search, X, ExternalLink, ArrowUpDown } from "lucide-react";
import { AppView } from "@/constants";

function App() {
  const [activeView, setActiveView] = useState(AppView.RESOURCES);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [isBookmarkModalOpen, setBookmarkModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "add";
  });
  const [isTagFilterModalOpen, setTagFilterModalOpen] = useState(false);
  const [isShortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [isTagCreateModalOpen, setTagCreateModalOpen] = useState(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isSortOpen, setSortOpen] = useState(false);

  const { tags } = useTags();
  const selectedTags = tags?.filter(t => filterTagIds.includes(t.id!)) || [];

  const [prefillData, setPrefillData] = useState<{ url: string; title: string } | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "add") {
      return {
        url: params.get("url") || "",
        title: params.get("title") || "",
      };
    }
    return undefined;
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "add") {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (e.key === '/') {
        if (!isInput) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      } else if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if (e.key === 'Escape') {
        if (isBookmarkModalOpen) setBookmarkModalOpen(false);
        if (isTagFilterModalOpen) setTagFilterModalOpen(false);
        if (isShortcutsModalOpen) setShortcutsModalOpen(false);
        setSearchTerm('');
        searchInputRef.current?.blur();
      } else if (e.key === '?' && !isInput) {
        setShortcutsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBookmarkModalOpen, isTagFilterModalOpen, isShortcutsModalOpen]);

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!isSortOpen) return;
    const handleClick = () => setSortOpen(false);
    // Delay so the button toggle click doesn't immediately close
    const timer = setTimeout(() => window.addEventListener('click', handleClick), 0);
    return () => { clearTimeout(timer); window.removeEventListener('click', handleClick); };
  }, [isSortOpen]);

  const handleApplyTagFilter = (selectedTagIds: string[]) => {
    setFilterTagIds(selectedTagIds);
  };

  return (
    <>
      <div className="flex h-screen w-full bg-canvas text-text-primary overflow-hidden">
        {/* Rail */}
        <aside className="w-[50px] flex-shrink-0 bg-surface border-r border-border flex flex-col items-center py-3.5">
          <button
            onClick={() => setActiveView(AppView.RESOURCES)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${activeView === AppView.RESOURCES ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:bg-surface-raised'}`}
            title="Dashboard"
          >
            &#9635;
          </button>
          <button
            onClick={() => setActiveView(AppView.TAGS)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${activeView === AppView.TAGS ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:bg-surface-raised'}`}
            title="Tags"
          >
            #
          </button>
          <button
            onClick={() => setActiveView(AppView.SETTINGS)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeView === AppView.SETTINGS ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:bg-surface-raised'}`}
            title="Settings"
          >
            &#9881;
          </button>
          <div className="flex-1"></div>
          <button
            onClick={() => {
              if (chrome?.tabs?.create && chrome?.runtime?.getURL) {
                chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
              } else {
                window.open(window.location.href, '_blank');
              }
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-surface-raised transition-colors mb-1.5"
            title="Open in Full Tab"
          >
            <ExternalLink size={16} />
          </button>
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:bg-surface-raised transition-colors"
            title="Shortcuts"
          >
            &#8942;
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
             <div className="flex items-center gap-2">
               <img src="/icons/icon-32.png" alt="Dagger" className="w-[18px] h-[18px]" />
               <div className="text-[14px] font-semibold tracking-tight">Dagger</div>
             </div>
             <button onClick={() => setBookmarkModalOpen(true)} className="add-btn px-3.5 py-1.5 flex items-center justify-center">
               + Add bookmark
             </button>
          </div>

          <div className="flex-1 flex flex-col min-h-0 w-full max-w-3xl mx-auto">
            {activeView === AppView.RESOURCES && (
              <div className="px-3.5 pb-2.5 shrink-0">
                <div className="search-box overflow-hidden">
                  <Search size={14} className="text-text-secondary shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search bookmarks"
                    className="bg-transparent border-none text-text-primary text-[12.5px] placeholder-text-secondary focus:outline-none flex-1 min-w-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="kbd shrink-0">/</span>
                </div>
              </div>
            )}

            {activeView === AppView.RESOURCES && (
              <div className="flex items-center gap-2.5 px-3.5 pb-3 shrink-0 flex-wrap">
                <div className="flex bg-[#201B14] border border-[#322B22] rounded-[7px] p-0.5">
                  <button
                    className={`text-[11.5px] font-medium px-[11px] py-[5px] rounded-[5px] transition-colors ${filterRead === undefined ? 'bg-[#3A2317] text-[#F0A57C]' : 'text-[#9C9184] hover:text-[#EFE7DA]'}`}
                    onClick={() => setFilterRead(undefined)}
                  >
                    All
                  </button>
                  <button
                    className={`text-[11.5px] font-medium px-[11px] py-[5px] rounded-[5px] transition-colors ${filterRead === false ? 'bg-[#3A2317] text-[#F0A57C]' : 'text-[#9C9184] hover:text-[#EFE7DA]'}`}
                    onClick={() => setFilterRead(false)}
                  >
                    Unread
                  </button>
                  <button
                    className={`text-[11.5px] font-medium px-[11px] py-[5px] rounded-[5px] transition-colors ${filterRead === true ? 'bg-[#3A2317] text-[#F0A57C]' : 'text-[#9C9184] hover:text-[#EFE7DA]'}`}
                    onClick={() => setFilterRead(true)}
                  >
                    Read
                  </button>
                </div>

                <div className="relative">
                  <button
                    className={`flex items-center gap-[6px] bg-[#201B14] border rounded-[7px] px-[11px] py-[7px] text-[11.5px] font-medium transition-colors ${filterTagIds.length > 0 || isTagFilterModalOpen ? 'border-[#E2622E] text-[#F0A57C]' : 'border-[#322B22] text-[#9C9184] hover:text-[#EFE7DA] hover:border-[#E2622E]/50'}`}
                    onClick={() => setTagFilterModalOpen(!isTagFilterModalOpen)}
                  >
                    Tags
                    {filterTagIds.length > 0 && (
                      <span className="bg-[#E2622E] text-[#FCEEE6] text-[9.5px] font-bold rounded-full px-1.5 py-[1px]">
                        {filterTagIds.length}
                      </span>
                    )}
                    <span>&#9662;</span>
                  </button>
                  {isTagFilterModalOpen && (
                    <TagFilterDropdown
                      onClose={() => setTagFilterModalOpen(false)}
                      selectedTagIds={filterTagIds}
                      onApply={handleApplyTagFilter}
                    />
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="relative ml-auto">
                  <button
                    className={`flex items-center gap-[6px] bg-[#201B14] border rounded-[7px] px-[11px] py-[7px] text-[11.5px] font-medium transition-colors ${isSortOpen ? 'border-[#E2622E] text-[#F0A57C]' : 'border-[#322B22] text-[#9C9184] hover:text-[#EFE7DA] hover:border-[#E2622E]/50'}`}
                    onClick={() => setSortOpen(!isSortOpen)}
                  >
                    <ArrowUpDown size={12} />
                    {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'alphabetical' ? 'A–Z' : 'Updated'}
                  </button>
                  {isSortOpen && (
                    <div className="absolute right-0 top-[110%] w-[140px] bg-[#1D1912] border border-[#322B22] rounded-[10px] shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden p-1">
                      {([['newest', 'Newest first'], ['oldest', 'Oldest first'], ['alphabetical', 'A → Z'], ['updated', 'Last updated']] as const).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => { setSortBy(value); setSortOpen(false); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-[11.5px] transition-colors ${sortBy === value ? 'bg-[#3A2317] text-[#F0A57C] font-medium' : 'text-[#EFE7DA] hover:bg-[#201B14]'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTags.length > 0 && (
                  <div className="w-px h-5 bg-border mx-1 my-auto hidden sm:block"></div>
                )}
                {selectedTags.map(tag => (
                  <span key={tag.id} className="tag-pill flex items-center gap-1 px-2 bg-white text-[#17140F] border-white shadow-sm font-semibold">
                    {tag.name}
                    <button
                      onClick={() => handleApplyTagFilter(filterTagIds.filter(id => id !== tag.id))}
                      className="text-accent hover:bg-accent hover:text-white rounded-full p-0.5 transition-colors ml-0.5"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {activeView === AppView.TAGS && (
              <div className="flex items-end justify-between px-3.5 pb-3 shrink-0">
                <div>
                  <h1 className="text-[19px] font-semibold text-text-primary">Tags</h1>
                  <div className="text-[12px] text-text-secondary mt-1 tracking-wide">
                    {tags?.length || 0} tag{(tags?.length ?? 0) !== 1 ? 's' : ''} &middot; organize your bookmarks
                  </div>
                </div>
                {tags && tags.length > 0 && (
                  <button
                    onClick={() => setTagCreateModalOpen(true)}
                    className="px-3.5 py-1.5 flex items-center justify-center rounded-[7px] text-[11.5px] font-medium border border-[#322B22] bg-[#201B14] text-[#EFE7DA] hover:border-[#E2622E] hover:text-[#F0A57C] transition-colors"
                  >
                    + New tag
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 min-h-0 flex flex-col px-2 pb-2">
              {activeView === AppView.RESOURCES && (
                <BookmarkList
                  searchTerm={searchTerm}
                  filterRead={filterRead}
                  filterTagIds={filterTagIds}
                  sortBy={sortBy}
                />
              )}
              {activeView === AppView.TAGS && (
                <div className="flex-1 min-h-0 overflow-y-auto px-1.5 custom-scrollbar">
                  <TagManager
                    requestCreateModal={isTagCreateModalOpen}
                    onCreateModalHandled={() => setTagCreateModalOpen(false)}
                  />
                </div>
              )}
              {activeView === AppView.SETTINGS && (
                <div className="flex-1 min-h-0 overflow-y-auto px-1.5 custom-scrollbar">
                  <ImportExport />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border py-2 px-3.5 flex gap-3 text-[10.5px] text-text-secondary bg-canvas shrink-0">
             <span className="flex items-center gap-1.5"><span className="kbd">Ctrl+Shift+K</span> Quick open</span>
             <span className="flex items-center gap-1.5"><span className="kbd">Alt+Shift+D</span> Open panel</span>
             <span className="flex items-center gap-1.5"><span className="kbd">Alt+Shift+S</span> Add page</span>
          </div>
        </main>
      </div>

      <Modal
        isOpen={isBookmarkModalOpen}
        onClose={() => {
          setBookmarkModalOpen(false);
          setPrefillData(undefined);
        }}
        title="Add New Bookmark"
      >
        <BookmarkForm initialResource={prefillData as any} onSave={() => {
          setBookmarkModalOpen(false);
          setPrefillData(undefined);
        }} />
      </Modal>

      <Modal
        isOpen={isShortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
        title="Keyboard Shortcuts"
      >
        <div className="space-y-4">
           <div className="flex justify-between items-center py-2 border-b border-border">
             <span className="text-text-secondary text-sm">Focus Search</span>
             <kbd className="kbd">/</kbd>
           </div>
           <div className="flex justify-between items-center py-2 border-b border-border">
             <span className="text-text-secondary text-sm">Clear Search / Close Modals</span>
             <kbd className="kbd">Esc</kbd>
           </div>
           <div className="flex justify-between items-center py-2 border-b border-border">
             <span className="text-text-secondary text-sm">Open Extension (Browser)</span>
             <kbd className="kbd">Alt/Opt + Shift + D</kbd>
           </div>
           <div className="flex justify-between items-center py-2 border-b border-border">
             <span className="text-text-secondary text-sm">Save Current Page (Browser)</span>
             <kbd className="kbd">Alt/Opt + Shift + S</kbd>
           </div>
           <div className="flex justify-between items-center py-2 border-b border-border">
             <span className="text-text-secondary text-sm">Quick Open</span>
             <kbd className="kbd">Ctrl/⌘ + K</kbd>
           </div>
        </div>
      </Modal>

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </>
  );
}

export default App;

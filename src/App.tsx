import { useState, useEffect, useRef, useMemo } from "react";
import { TagManager } from "@/components/tags/TagManager";
import BookmarkForm from "@/components/BookmarkForm";
import BookmarkList, { type SortOption } from "@/components/BookmarkList";
import ImportExport from "@/components/ImportExport";
import Modal from "@/components/Modal";
import TagFilterDropdown from "@/components/TagFilterDropdown";
import { CommandPalette } from "@/components/CommandPalette";
import { useTags } from "@/hooks/useTags";
import { Search, X, ExternalLink, ArrowUpDown, BarChart3, LibraryBig, Tags, Settings2, CircleHelp, Plus } from "lucide-react";
import { AppView } from "@/constants";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import { BackupNudge } from "@/recovery/BackupNudge";

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const actionParam = searchParams.get("action");
  const isCommandPaletteOverlay = actionParam === "command-palette-overlay";
  const isAddOverlay = actionParam === "add-overlay";
  const isOverlayMode = isCommandPaletteOverlay || isAddOverlay;

  useEffect(() => {
    if (isOverlayMode) {
      document.body.classList.remove("bg-background");
      document.body.style.backgroundColor = "transparent";
    }
  }, [isOverlayMode]);

  const [activeView, setActiveView] = useState(AppView.RESOURCES);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRead, setFilterRead] = useState<boolean | undefined>(undefined);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [isBookmarkModalOpen, setBookmarkModalOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "add" || params.get("action") === "add-overlay";
  });
  const [isTagFilterModalOpen, setTagFilterModalOpen] = useState(false);
  const [isShortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [isTagCreateModalOpen, setTagCreateModalOpen] = useState(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("action") === "command-palette" || params.get("action") === "command-palette-overlay";
  });
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isSortOpen, setSortOpen] = useState(false);

  const { tags } = useTags();
  const activeFilterTagIds = useMemo(() => {
    const available = new Set(tags.map((tag) => tag.id));
    return filterTagIds.filter((id) => available.has(id));
  }, [filterTagIds, tags]);
  const selectedTags = useMemo(() => tags.filter((tag) => activeFilterTagIds.includes(tag.id)), [tags, activeFilterTagIds]);

  const [prefillData, setPrefillData] = useState<{ url: string; title: string } | undefined>(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (action === "add" || action === "add-overlay") {
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
    if (params.get("action") === "add" || params.get("action") === "command-palette") {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLElement && (e.target.matches('input, textarea, select') || e.target.isContentEditable);

      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!isInput) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      } else if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if (e.key === 'Escape') {
        setSearchTerm('');
        searchInputRef.current?.blur();
      } else if (e.key === '?' && !isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        setShortcutsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    if (!isSortOpen) return;
    const handleClick = () => setSortOpen(false);
    const timer = setTimeout(() => window.addEventListener('click', handleClick), 0);
    return () => { clearTimeout(timer); window.removeEventListener('click', handleClick); };
  }, [isSortOpen]);

  const closeAddModal = () => {
    setBookmarkModalOpen(false);
    setPrefillData(undefined);
    if (isAddOverlay) window.parent.postMessage({ type: 'CLOSE_COMMAND_PALETTE' }, '*');
  };

  if (isOverlayMode) {
    if (isCommandPaletteOverlay) {
      return (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => {
            setCommandPaletteOpen(false);
            window.parent.postMessage({ type: 'CLOSE_COMMAND_PALETTE' }, '*');
          }}
        />
      );
    }
    if (isAddOverlay) {
      return (
        <Modal
          isOpen={isBookmarkModalOpen}
          onClose={closeAddModal}
          title="Add New Bookmark"
        >
          <BookmarkForm initialResource={prefillData} onSave={closeAddModal} onCancel={closeAddModal} />
        </Modal>
      );
    }
  }

  const handleApplyTagFilter = (selectedTagIds: string[]) => {
    setFilterTagIds(selectedTagIds);
  };

  return (
    <>
      <div className="flex h-screen w-full bg-canvas text-text-primary overflow-hidden">
        {/* Rail */}
        <aside className="flex w-[56px] flex-shrink-0 flex-col items-center border-r border-border bg-surface py-4" aria-label="Main navigation">
          <button
            onClick={() => setActiveView(AppView.RESOURCES)}
            className={`mb-2 flex size-9 items-center justify-center rounded-[10px] transition-colors ${activeView === AppView.RESOURCES ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'}`}
            title="Bookmarks"
            aria-label="Bookmarks"
            aria-current={activeView === AppView.RESOURCES ? "page" : undefined}
          >
            <LibraryBig size={18} strokeWidth={1.9} />
          </button>
          <button
            onClick={() => setActiveView(AppView.TAGS)}
            className={`mb-2 flex size-9 items-center justify-center rounded-[10px] transition-colors ${activeView === AppView.TAGS ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'}`}
            title="Tags"
            aria-label="Tags"
            aria-current={activeView === AppView.TAGS ? "page" : undefined}
          >
            <Tags size={18} strokeWidth={1.9} />
          </button>
          <button
            onClick={() => setActiveView(AppView.ANALYTICS)}
            className={`mb-2 flex size-9 items-center justify-center rounded-[10px] transition-colors ${activeView === AppView.ANALYTICS ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'}`}
            title="Analytics"
            aria-label="Analytics"
            aria-current={activeView === AppView.ANALYTICS ? "page" : undefined}
          >
            <BarChart3 size={18} strokeWidth={1.9} />
          </button>
          <button
            onClick={() => setActiveView(AppView.SETTINGS)}
            className={`flex size-9 items-center justify-center rounded-[10px] transition-colors ${activeView === AppView.SETTINGS ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'}`}
            title="Settings"
            aria-label="Settings"
            aria-current={activeView === AppView.SETTINGS ? "page" : undefined}
          >
            <Settings2 size={18} strokeWidth={1.9} />
          </button>
          <div className="flex-1"></div>
          <button
            onClick={() => {
              if (typeof chrome !== 'undefined' && chrome.tabs?.create && chrome.runtime?.getURL) {
                chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
              } else {
                window.open(window.location.href, '_blank');
              }
            }}
            className="mb-2 flex size-9 items-center justify-center rounded-[10px] text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            title="Open in Full Tab"
            aria-label="Open in full tab"
          >
            <ExternalLink size={18} strokeWidth={1.9} />
          </button>
          <button
            onClick={() => setShortcutsModalOpen(true)}
            className="flex size-9 items-center justify-center rounded-[10px] text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            title="Shortcuts"
            aria-label="Keyboard shortcuts"
          >
            <CircleHelp size={18} strokeWidth={1.9} />
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-4 pt-4">
             <div className="flex min-w-0 items-center gap-2.5">
               <img src="/icons/icon-32.png" alt="" className="size-[22px] shrink-0" />
               <div className="min-w-0 leading-tight"><div className="text-[15px] font-bold tracking-[-0.035em]">Dagger</div><div className="text-[10px] text-text-muted">Your bookmarks</div></div>
             </div>
             <button onClick={() => setBookmarkModalOpen(true)} className="add-btn shrink-0 !px-3 !py-2">
               <Plus size={15} /> Add bookmark
             </button>
          </div>

          {activeView !== AppView.SETTINGS && <BackupNudge onOpenRecovery={() => setActiveView(AppView.SETTINGS)} />}

          <div className="flex-1 flex flex-col min-h-0 w-full max-w-3xl mx-auto">
            {activeView === AppView.RESOURCES && (
              <div className="px-3.5 pb-2.5 shrink-0">
                <div className="search-box overflow-hidden">
                  <Search size={14} className="text-text-secondary shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search bookmarks"
                    className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search bookmarks"
                  />
                  <span className="kbd shrink-0">/</span>
                </div>
              </div>
            )}

            {activeView === AppView.RESOURCES && (
              <div className="flex items-center gap-2.5 px-3.5 pb-3 shrink-0 flex-wrap">
                <div className="flex rounded-[9px] border border-border bg-surface-raised p-0.5">
                  <button
                    className={`rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition-colors ${filterRead === undefined ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setFilterRead(undefined)}
                  >
                    All
                  </button>
                  <button
                    className={`rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition-colors ${filterRead === false ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setFilterRead(false)}
                  >
                    Unread
                  </button>
                  <button
                    className={`rounded-[7px] px-3 py-1.5 text-[12px] font-medium transition-colors ${filterRead === true ? 'bg-accent-subtle text-accent-text' : 'text-text-secondary hover:text-text-primary'}`}
                    onClick={() => setFilterRead(true)}
                  >
                    Read
                  </button>
                </div>

                <div className="relative">
                  <button
                    className={`flex items-center gap-1.5 rounded-[9px] border bg-surface-raised px-3 py-2 text-[12px] font-medium transition-colors ${activeFilterTagIds.length > 0 || isTagFilterModalOpen ? 'border-accent text-accent-text' : 'border-border text-text-secondary hover:border-accent/50 hover:text-text-primary'}`}
                    onClick={() => setTagFilterModalOpen(!isTagFilterModalOpen)}
                  >
                    Tags
                    {activeFilterTagIds.length > 0 && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {activeFilterTagIds.length}
                      </span>
                    )}
                    <span>&#9662;</span>
                  </button>
                  {isTagFilterModalOpen && (
                    <TagFilterDropdown
                      onClose={() => setTagFilterModalOpen(false)}
                      selectedTagIds={activeFilterTagIds}
                      onApply={handleApplyTagFilter}
                    />
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="relative ml-auto">
                  <button
                    className={`flex items-center gap-1.5 rounded-[9px] border bg-surface-raised px-3 py-2 text-[12px] font-medium transition-colors ${isSortOpen ? 'border-accent text-accent-text' : 'border-border text-text-secondary hover:border-accent/50 hover:text-text-primary'}`}
                    onClick={() => setSortOpen(!isSortOpen)}
                  >
                    <ArrowUpDown size={12} />
                    {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'alphabetical' ? 'A–Z' : 'Updated'}
                  </button>
                  {isSortOpen && (
                    <div className="absolute right-0 top-[110%] z-50 w-[150px] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                      {([['newest', 'Newest first'], ['oldest', 'Oldest first'], ['alphabetical', 'A → Z'], ['updated', 'Last updated']] as const).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => { setSortBy(value); setSortOpen(false); }}
                          className={`w-full rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors ${sortBy === value ? 'bg-accent-subtle font-medium text-accent-text' : 'text-text-primary hover:bg-surface-raised'}`}
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
                  <span key={tag.id} className="tag-pill flex items-center gap-1 border border-accent/25 bg-accent-subtle px-2.5 py-1 font-medium text-accent-text">
                    {tag.name}
                    <button
                      onClick={() => handleApplyTagFilter(activeFilterTagIds.filter(id => id !== tag.id))}
                      className="ml-0.5 rounded-full p-0.5 text-accent-text transition-colors hover:bg-accent hover:text-white"
                      aria-label={`Remove ${tag.name} filter`}
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
                    className="soft-btn !text-[12px]"
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
                  filterTagIds={activeFilterTagIds}
                  sortBy={sortBy}
                  onAddBookmark={() => setBookmarkModalOpen(true)}
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
              {activeView === AppView.ANALYTICS && (
                <div className="flex-1 min-h-0 overflow-y-auto px-1.5 custom-scrollbar">
                  <AnalyticsDashboard />
                </div>
              )}
              {activeView === AppView.SETTINGS && (
                <div className="flex-1 min-h-0 overflow-y-auto px-1.5 custom-scrollbar">
                  <ImportExport />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border py-2 px-3.5 flex flex-wrap justify-start gap-3 gap-y-1.5 text-[10.5px] text-text-secondary bg-canvas shrink-0">
             <span className="flex items-center gap-1.5"><span className="kbd">Alt+Shift+S</span> Add page</span>
             <span className="flex items-center gap-1.5"><span className="kbd">Alt+Shift+A</span> Add all tabs</span>
          </div>
        </main>
      </div>

      <Modal
        isOpen={isBookmarkModalOpen}
        onClose={closeAddModal}
        title="Add New Bookmark"
      >
        <BookmarkForm initialResource={prefillData} onSave={closeAddModal} onCancel={closeAddModal} />
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
             <span className="text-text-secondary text-sm">Save All Open Tabs (Browser)</span>
             <kbd className="kbd">Alt/Opt + Shift + A</kbd>
           </div>
           <div className="flex justify-between items-center py-2 border-b border-border">
             <span className="text-text-secondary text-sm">Quick Open</span>
             <kbd className="kbd">Ctrl/⌘ + Shift + K</kbd>
           </div>
        </div>
      </Modal>

      {isCommandPaletteOpen && <CommandPalette isOpen onClose={() => setCommandPaletteOpen(false)} />}
    </>
  );
}

export default App;

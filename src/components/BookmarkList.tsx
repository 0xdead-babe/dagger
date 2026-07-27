import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useSearch } from "@/hooks/useSearch";
import { useTags } from "@/hooks/useTags";
import BookmarkForm from "@/components/BookmarkForm";
import Modal from "@/components/Modal";
import { ERROR_MESSAGES } from "@/constants";
import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { SkeletonCard } from "@/components/bookmarks/SkeletonCard";
import type { Bookmark } from "@/types/entities";

export type SortOption = "newest" | "oldest" | "alphabetical" | "updated";

interface BookmarkListProps {
  searchTerm: string;
  filterRead?: boolean;
  filterTagIds: string[];
  sortBy: SortOption;
}

function BookmarkList({
  searchTerm,
  filterRead,
  filterTagIds,
  sortBy,
}: BookmarkListProps) {
  const { bookmarks, deleteBookmark, updateBookmark } = useBookmarks();
  const { tags } = useTags();
  const getTagName = useCallback((tagId: string) =>
    tags?.find((tag) => tag.id === tagId)?.name || "...",
  [tags]);

  const { results, isSearching } = useSearch(
    searchTerm,
    filterRead,
    filterTagIds,
    bookmarks ?? []
  );
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | undefined>(
    undefined,
  );
  const [visibleCount, setVisibleCount] = useState(50);

  useEffect(() => {
    setVisibleCount(50);
  }, [searchTerm, filterRead, filterTagIds, sortBy]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observerTarget = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    if (node && scrollContainerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => prev + 50);
          }
        },
        {
          root: scrollContainerRef.current,
          rootMargin: "200px"
        },
      );
      observerRef.current.observe(node);
    }
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm(ERROR_MESSAGES.DELETE_RESOURCE_CONFIRMATION)) {
      await deleteBookmark(id);
    }
  };

  const handleEdit = (bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    await updateBookmark(id, { pinned });
  };

  const closeEditModal = () => {
    setEditingBookmark(undefined);
  };

  // Sort and separate pinned bookmarks
  const { pinnedResults, unpinnedResults } = useMemo(() => {
    if (!results) return { pinnedResults: [], unpinnedResults: [] };

    const sorted = [...results].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.createdAt - b.createdAt;
        case "alphabetical":
          return (a.title || "").localeCompare(b.title || "");
        case "updated":
          return b.updatedAt - a.updatedAt;
        case "newest":
        default:
          return b.createdAt - a.createdAt;
      }
    });

    const isFiltering = searchTerm || filterRead !== undefined || filterTagIds.length > 0;
    if (isFiltering) {
      // When filtering/searching, don't separate pinned — just show sorted results
      return { pinnedResults: [], unpinnedResults: sorted };
    }

    const pinned = sorted.filter((b) => b.pinned);
    const unpinned = sorted.filter((b) => !b.pinned);
    return { pinnedResults: pinned, unpinnedResults: unpinned };
  }, [results, sortBy, searchTerm, filterRead, filterTagIds]);

  const visibleUnpinned = unpinnedResults.slice(0, visibleCount);
  const hasMore = visibleCount < unpinnedResults.length;

  return (
    <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto pr-1.5 custom-scrollbar">
      {isSearching ? (
        <div className="pb-4">
          <div className="card">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard isLast />
          </div>
        </div>
      ) : results && (pinnedResults.length > 0 || unpinnedResults.length > 0) ? (
        <div className="pb-4 space-y-3">
          {/* Pinned section */}
          {pinnedResults.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-1 pb-1.5">
                <span className="section-label">
                  Pinned
                </span>
                <span className="text-[10px] text-[#544C40]">
                  {pinnedResults.length}
                </span>
              </div>
              <div className="card">
                {pinnedResults.map((bookmark, index) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    isLast={index === pinnedResults.length - 1}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onTogglePin={handleTogglePin}
                    getTagName={getTagName}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main list */}
          <div>
            {pinnedResults.length > 0 && unpinnedResults.length > 0 && (
              <div className="flex items-center gap-1.5 px-1 pb-1.5">
                <span className="section-label">
                  All Bookmarks
                </span>
                <span className="text-[10px] text-[#544C40]">
                  {unpinnedResults.length}
                </span>
              </div>
            )}
            <div className="card">
              {visibleUnpinned.map((bookmark, index) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  isLast={!hasMore && index === visibleUnpinned.length - 1}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  getTagName={getTagName}
                />
              ))}
              {hasMore && (
                <div
                  ref={observerTarget}
                  className="flex items-center justify-center gap-2 py-3.5 text-[11px] text-[#6E6455]"
                >
                  <div className="w-3 h-3 rounded-full border-2 border-[#322B22] border-t-[#E2622E] animate-spin"></div>
                  Loading more bookmarks…
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center px-8 py-16 gap-1.5">
          {searchTerm || filterRead !== undefined || filterTagIds.length > 0 ? (
            <>
              <div className="text-[14px] font-medium text-text-primary">
                No matching bookmarks
              </div>
              <div className="text-[12px] text-text-secondary leading-snug mb-2.5">
                We couldn't find any bookmarks matching your current search or
                filters.
              </div>
            </>
          ) : (
            <>
              <div className="text-[14px] font-medium text-text-primary">
                Save your first page to get started
              </div>
              <div className="text-[12px] text-text-secondary leading-snug mb-2.5">
                Bookmarks you add will show up here, searchable by title, tag,
                and content.
              </div>
              <button
                className="px-3.5 py-1.5 mt-2 flex items-center justify-center rounded-[7px] text-[11.5px] font-medium border border-[#322B22] bg-[#201B14] text-[#EFE7DA] hover:border-[#E2622E] hover:text-[#F0A57C] transition-colors"
                onClick={() => setEditingBookmark({} as Bookmark)}
              >
                + Add bookmark
              </button>
            </>
          )}
        </div>
      )}

      {editingBookmark && (
        <Modal
          isOpen={!!editingBookmark}
          onClose={closeEditModal}
          title="Edit Bookmark"
        >
          <BookmarkForm
            initialResource={editingBookmark}
            onSave={closeEditModal}
          />
        </Modal>
      )}
    </div>
  );
}

export default BookmarkList;

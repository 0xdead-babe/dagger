import { useState, useEffect } from 'react';
import { useResources } from '@/hooks/useResources';
import { useTags } from '@/hooks/useTags';
import type { Resource } from '@/db/db';
import BookmarkForm from '@/components/BookmarkForm';
import Modal from '@/components/Modal';
import { Pencil, Trash2, CheckCircle, Circle } from 'lucide-react';
import { ERROR_MESSAGES } from '@/constants';

const searchWorker = new Worker(new URL('../workers/searchWorker.ts', import.meta.url), {
  type: 'module',
});

interface BookmarkCardProps {
  resource: Resource;
  onEdit: (resource: Resource) => void;
  onDelete: (id: number) => void;
  onToggleRead: (id: number, readStatus: boolean) => void;
}

function BookmarkCard({ resource, onEdit, onDelete, onToggleRead }: BookmarkCardProps) {
  const { tags } = useTags();

  const getTagName = (tagId: number) => tags?.find(tag => tag.id === tagId)?.name || '...';
  const getTagColor = (tagId: number) => tags?.find(tag => tag.id === tagId)?.color || '#9ca3af';

  const navigateToResource = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="group relative flex flex-col md:flex-row items-start md:items-center justify-between rounded-xl border border-surface bg-surface p-4 transition-all duration-300 hover:bg-surface/80 cursor-pointer"
      onClick={() => navigateToResource(resource.url)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); // Prevent default scroll behavior for space key
          navigateToResource(resource.url);
        }
      }}
      tabIndex={0}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-text-primary line-clamp-1">
          {resource.title}
        </h3>
        <p className="mt-1 text-xs text-text-secondary break-all line-clamp-1">{new URL(resource.url).hostname}</p>
        {resource.description && (
          <p className="mt-3 text-sm text-text-secondary line-clamp-2">{resource.description}</p>
        )}
      </div>

      <div className="md:ml-4 mt-4 md:mt-0 flex flex-wrap gap-2 justify-end">
        {resource.tagIds?.map(tagId => (
          <span key={tagId} className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: getTagColor(tagId), color: '#fff' }}>
            {getTagName(tagId)}
          </span>
        ))}
      </div>
      
      <div className="md:ml-4 mt-4 md:mt-0 flex-shrink-0 flex items-center gap-4 text-xs text-text-secondary">
        <span className="hidden md:block">Added: {new Date(resource.createdAt).toLocaleDateString()}</span>
        <button onClick={(e) => { e.stopPropagation(); onToggleRead(resource.id!, !resource.read); }} className="flex items-center gap-1 hover:text-text-primary transition-colors">
          {resource.read ? <CheckCircle size={14} className="text-green-500" /> : <Circle size={14} />}
          <span className="hidden md:block">{resource.read ? 'Read' : 'Unread'}</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); onEdit(resource); }} className="hover:text-yellow-400 transition-colors"><Pencil size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(resource.id!); }} className="hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

interface BookmarkListProps {
  searchTerm: string;
  filterRead: boolean | undefined;
  filterTagIds: number[];
}

function BookmarkList({ searchTerm, filterRead, filterTagIds }: BookmarkListProps) {
  const { resources, deleteResource, updateResource } = useResources();
  const [editingResource, setEditingResource] = useState<Resource | undefined>(undefined);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    if (resources) {
      setIsFiltering(true);
      searchWorker.postMessage({ resources, searchTerm, filterRead, filterTagIds });
    }
  }, [resources, searchTerm, filterRead, filterTagIds]);

  useEffect(() => {
    searchWorker.onmessage = (event: MessageEvent<Resource[]>) => {
      setFilteredResources(event.data);
      setIsFiltering(false);
    };
    return () => { searchWorker.onmessage = null; };
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm(ERROR_MESSAGES.DELETE_RESOURCE_CONFIRMATION)) {
      await deleteResource(id);
    }
  };

  const handleToggleRead = async (id: number, readStatus: boolean) => {
    await updateResource(id, { read: readStatus });
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
  };

  const closeEditModal = () => {
    setEditingResource(undefined);
  };

  if (isFiltering && !resources) {
    return <p className="text-center text-text-secondary col-span-full">Loading bookmarks...</p>;
  }

  return (
    <>
      <div className="flex flex-col w-full gap-6">
        {filteredResources?.map((resource) => (
          <BookmarkCard
            key={resource.id}
            resource={resource}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleRead={handleToggleRead}
          />
        ))}
      </div>
      {filteredResources.length === 0 && !isFiltering && (
        <div className="text-center col-span-full py-12">
          <h3 className="text-lg font-medium text-text-primary">No bookmarks found</h3>
          <p className="text-text-secondary mt-1">Try adjusting your search or filters.</p>
        </div>
      )}

      {editingResource && (
        <Modal isOpen={!!editingResource} onClose={closeEditModal} title="Edit Bookmark">
          <BookmarkForm initialResource={editingResource} onSave={closeEditModal} />
        </Modal>
      )}
    </>
  );
}

export default BookmarkList;
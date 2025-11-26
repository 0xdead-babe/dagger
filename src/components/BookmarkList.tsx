import React, { useState, useEffect } from 'react';
import { useResources } from '@/hooks/useResources';
import { useTags } from '@/hooks/useTags';
import type { Resource } from '@/db/db';
import BookmarkForm from '@/components/BookmarkForm';
import Modal from '@/components/Modal';
import { Pencil, Trash2, CheckCircle, Circle } from 'lucide-react';

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

  return (
    <div className="group relative flex flex-col rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 transition-all duration-300 hover:bg-slate-800 hover:border-slate-700">
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-slate-100">
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors line-clamp-2">
            {resource.title}
          </a>
        </h3>
        <p className="mt-1 text-xs text-slate-400 break-all">{new URL(resource.url).hostname}</p>
        {resource.description && (
          <p className="mt-3 text-sm text-slate-400 line-clamp-3">{resource.description}</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {resource.tagIds?.map(tagId => (
          <span key={tagId} className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: getTagColor(tagId), color: '#fff' }}>
            {getTagName(tagId)}
          </span>
        ))}
      </div>
      
      <div className="mt-4 flex items-center text-xs text-slate-500">
        <span>Added: {new Date(resource.createdAt).toLocaleDateString()}</span>
        <div className="ml-auto flex items-center gap-4">
          <button onClick={() => onToggleRead(resource.id!, !resource.read)} className="flex items-center gap-1 hover:text-slate-200 transition-colors">
            {resource.read ? <CheckCircle size={14} className="text-green-500" /> : <Circle size={14} />}
            <span>{resource.read ? 'Read' : 'Unread'}</span>
          </button>
          <button onClick={() => onEdit(resource)} className="hover:text-yellow-400 transition-colors"><Pencil size={14} /></button>
          <button onClick={() => onDelete(resource.id!)} className="hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
        </div>
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
    if (window.confirm('Are you sure you want to delete this bookmark?')) {
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
    return <p className="text-center text-slate-400 col-span-full">Loading bookmarks...</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <h3 className="text-lg font-medium text-slate-300">No bookmarks found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your search or filters.</p>
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
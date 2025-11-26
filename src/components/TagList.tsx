import { useState, useEffect } from 'react';
import { useTags } from '@/hooks/useTags';
import type { Tag } from '@/db/db';
import { Trash2 } from 'lucide-react';
import { ERROR_MESSAGES } from '@/constants';

interface TagWithCount extends Tag {
  resourceCount: number;
  readCount: number;
}

function TagList() {
  const { tags, getResourceCountForTag, getReadResourceCountForTag, deleteTag } = useTags();
  const [tagsWithCounts, setTagsWithCounts] = useState<TagWithCount[]>([]);

  useEffect(() => {
    const fetchCounts = async () => {
      if (tags) {
        const counts = await Promise.all(
          tags.map(async (tag) => {
            const totalCount = tag.id !== undefined ? await getResourceCountForTag(tag.id) : 0;
            const readCount = tag.id !== undefined ? await getReadResourceCountForTag(tag.id) : 0;
            return { ...tag, resourceCount: totalCount, readCount: readCount };
          })
        );
        setTagsWithCounts(counts);
      }
    };
    fetchCounts();
  }, [tags, getResourceCountForTag, getReadResourceCountForTag]);

  const handleDelete = async (id: number) => {
    if (window.confirm(ERROR_MESSAGES.DELETE_TAG_CONFIRMATION)) {
      // Note: We should also handle un-tagging resources that use this tag.
      // Dexie doesn't automatically handle cascading deletes of relationships.
      await deleteTag(id);
    }
  };

  return (
    <div className="rounded-xl border border-surface bg-surface p-4">
      <h2 className="text-lg font-semibold text-text-primary mb-4">All Tags</h2>
      {tagsWithCounts && tagsWithCounts.length > 0 ? (
        <div className="space-y-2">
          {tagsWithCounts.map((tag) => (
            <div
              key={tag.id}
              className="group flex items-center justify-between rounded-lg bg-surface p-3 transition-colors hover:bg-surface/80"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                ></span>
                <span className="font-medium text-text-primary">{tag.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-text-secondary">
                  {tag.readCount} read of {tag.resourceCount} {tag.resourceCount === 1 ? 'item' : 'items'}
                </span>
                <button 
                  onClick={() => handleDelete(tag.id!)} 
                  className="text-text-secondary opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <h3 className="text-md font-medium text-text-primary">No tags created</h3>
          <p className="text-text-secondary mt-1 text-sm">Use the form to create your first tag.</p>
        </div>
      )}
    </div>
  );
}

export default TagList;

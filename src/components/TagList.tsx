import React, { useState, useEffect } from 'react';
import { useTags } from '@/hooks/useTags';
import type { Tag } from '@/db/db';
import { Trash2 } from 'lucide-react';

interface TagWithCount extends Tag {
  resourceCount: number;
}

function TagList() {
  const { tags, getResourceCountForTag, deleteTag } = useTags();
  const [tagsWithCounts, setTagsWithCounts] = useState<TagWithCount[]>([]);

  useEffect(() => {
    const fetchCounts = async () => {
      if (tags) {
        const counts = await Promise.all(
          tags.map(async (tag) => {
            const count = tag.id !== undefined ? await getResourceCountForTag(tag.id) : 0;
            return { ...tag, resourceCount: count };
          })
        );
        setTagsWithCounts(counts);
      }
    };
    fetchCounts();
  }, [tags, getResourceCountForTag]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this tag? This action cannot be undone.')) {
      // Note: We should also handle un-tagging resources that use this tag.
      // Dexie doesn't automatically handle cascading deletes of relationships.
      await deleteTag(id);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">All Tags</h2>
      {tagsWithCounts && tagsWithCounts.length > 0 ? (
        <div className="space-y-2">
          {tagsWithCounts.map((tag) => (
            <div
              key={tag.id}
              className="group flex items-center justify-between rounded-lg bg-slate-800 p-3 transition-colors hover:bg-slate-700/50"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                ></span>
                <span className="font-medium text-slate-200">{tag.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">
                  {tag.resourceCount} {tag.resourceCount === 1 ? 'item' : 'items'}
                </span>
                <button 
                  onClick={() => handleDelete(tag.id!)} 
                  className="text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <h3 className="text-md font-medium text-slate-300">No tags created</h3>
          <p className="text-slate-500 mt-1 text-sm">Use the form to create your first tag.</p>
        </div>
      )}
    </div>
  );
}

export default TagList;

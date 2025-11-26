import React, { useState, useMemo } from 'react';
import { useTags } from '@/hooks/useTags';
import Modal from '@/components/Modal';

interface TagFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTagIds: number[];
  onApply: (selectedTagIds: number[]) => void;
}

function TagFilterModal({ isOpen, onClose, selectedTagIds, onApply }: TagFilterModalProps) {
  const { tags } = useTags();
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelectedTagIds, setLocalSelectedTagIds] = useState(selectedTagIds);

  const filteredTags = useMemo(() => {
    if (!tags) return [];
    return tags.filter(tag =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tags, searchTerm]);

  const handleTagToggle = (tagId: number) => {
    setLocalSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleApply = () => {
    onApply(localSelectedTagIds);
    onClose();
  };

  const handleClear = () => {
    setLocalSelectedTagIds([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filter by Tags">
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search tags..."
          className="w-full rounded-md border-surface bg-surface p-2 text-text-primary placeholder-text-secondary focus:border-primary focus:ring-primary focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="max-h-60 overflow-y-auto space-y-2">
          {filteredTags.map(tag => (
            <label key={tag.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-surface/80">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-surface bg-surface text-primary focus:ring-primary focus:outline-none"
                checked={localSelectedTagIds.includes(tag.id!)}
                onChange={() => handleTagToggle(tag.id!)}
              />
              <span style={{ color: tag.color }} className="font-semibold">{tag.name}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-4 pt-4">
          <button
            onClick={handleClear}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface"
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-secondary/80"
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default TagFilterModal;
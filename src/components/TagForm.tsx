import React, { useState } from 'react';
import { useTags } from '@/hooks/useTags';
import { Plus } from 'lucide-react';

function TagForm() {
  const { addTag } = useTags();
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3b82f6'); // Default to a nice blue

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tagName.trim()) {
      await addTag(tagName.trim(), tagColor);
      setTagName('');
      setTagColor('#3b82f6');
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Create New Tag</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tagName" className="block text-sm font-medium text-slate-300 mb-1">
            Tag Name
          </label>
          <input
            type="text" id="tagName" required placeholder="e.g., 'React'"
            className="w-full rounded-md border-slate-600 bg-slate-700/50 p-2 text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
            value={tagName} onChange={(e) => setTagName(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="tagColor" className="block text-sm font-medium text-slate-300 mb-1">
            Tag Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color" id="tagColor"
              className="h-10 w-14 cursor-pointer rounded-md border-slate-600 bg-slate-700/50 p-1"
              value={tagColor} onChange={(e) => setTagColor(e.target.value)}
            />
            <input
              type="text"
              className="w-full rounded-md border-slate-600 bg-slate-700/50 p-2 text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
              value={tagColor} onChange={(e) => setTagColor(e.target.value)}
            />
          </div>
        </div>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <Plus size={16} />
          Create Tag
        </button>
      </form>
    </div>
  );
}

export default TagForm;
import React, { useState, useEffect } from 'react';
import { useResources } from '@/hooks/useResources';
import { useTags } from '@/hooks/useTags';
import type { Resource } from '@/db/db';
import { Check, Loader2, Save } from 'lucide-react';

interface BookmarkFormProps {
  initialResource?: Resource;
  onSave?: () => void;
}

function BookmarkForm({ initialResource, onSave }: BookmarkFormProps) {
  const { addResource, updateResource } = useResources();
  const { tags } = useTags();

  const [url, setUrl] = useState(initialResource?.url || '');
  const [title, setTitle] = useState(initialResource?.title || '');
  const [description, setDescription] = useState(initialResource?.description || '');
  const [read, setRead] = useState(initialResource?.read || false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(initialResource?.tagIds || []);
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');

  useEffect(() => {
    // This title fetching logic remains the same, but the UI feedback will be improved.
    const fetchTitle = async () => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        setLoadingTitle(true);
        setErrorTitle('');
        try {
          const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
          if (!response.ok) throw new Error('Network response was not ok.');
          const text = await response.text();
          const doc = new DOMParser().parseFromString(text, 'text/html');
          const detectedTitle = doc.querySelector('title')?.textContent;
          if (detectedTitle) {
            setTitle(detectedTitle);
          } else {
            setErrorTitle('Could not detect title. Please enter manually.');
          }
        } catch (error) {
          console.error("Error fetching title:", error);
          setErrorTitle('Failed to fetch title (CORS issue?). Please enter manually.');
        } finally {
          setLoadingTitle(false);
        }
      } else {
        setTitle('');
        setErrorTitle('');
      }
    };
    if (!initialResource && url && !title) {
      const handler = setTimeout(() => fetchTitle(), 500);
      return () => clearTimeout(handler);
    }
  }, [url, initialResource, title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) {
      alert('URL and Title are required.');
      return;
    }
    const resourceData = { url: url.trim(), title: title.trim(), description: description.trim(), read, tagIds: selectedTagIds };
    if (initialResource?.id) {
      await updateResource(initialResource.id, resourceData);
    } else {
      await addResource(resourceData);
    }
    if (onSave) onSave();
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const InputField = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField id="url" label="URL">
        <div className="relative">
          <input
            type="url" id="url" required placeholder="https://example.com"
            className="w-full rounded-md border-slate-600 bg-slate-700/50 p-2 text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
            value={url} onChange={(e) => setUrl(e.target.value)}
          />
          {loadingTitle && <Loader2 className="absolute right-2 top-2 h-5 w-5 animate-spin text-slate-400" />}
        </div>
        {errorTitle && <p className="mt-1 text-sm text-red-400">{errorTitle}</p>}
      </InputField>

      <InputField id="title" label="Title">
        <input
          type="text" id="title" required placeholder="Bookmark Title"
          className="w-full rounded-md border-slate-600 bg-slate-700/50 p-2 text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
          value={title} onChange={(e) => setTitle(e.target.value)}
        />
      </InputField>

      <InputField id="description" label="Description">
        <textarea
          id="description" rows={4} placeholder="Optional description..."
          className="w-full rounded-md border-slate-600 bg-slate-700/50 p-2 text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
          value={description} onChange={(e) => setDescription(e.target.value)}
        />
      </InputField>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2">
          {tags?.map(tag => {
            const isSelected = selectedTagIds.includes(tag.id!);
            return (
              <button
                type="button" key={tag.id} onClick={() => handleTagToggle(tag.id!)}
                className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition-all duration-200 ${
                  isSelected ? 'text-white' : 'text-slate-300 bg-slate-700/50 hover:bg-slate-700'
                }`}
                style={{ backgroundColor: isSelected ? tag.color : undefined }}
              >
                {isSelected && <Check size={14} />}
                {tag.name}
              </button>
            );
          })}
          {tags?.length === 0 && <p className="text-slate-500 text-sm">No tags available. Go to "Tags" to create some.</p>}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox" id="read"
            className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
            checked={read} onChange={(e) => setRead(e.target.checked)}
          />
          <span className="text-sm font-medium text-slate-300">Mark as read</span>
        </label>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <Save size={16} />
          {initialResource ? 'Save Changes' : 'Save Bookmark'}
        </button>
      </div>
    </form>
  );
}

export default BookmarkForm;
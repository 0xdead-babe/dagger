import React, { useRef, useState } from 'react';
import { db } from '@/db/db';
import type { Tag } from '@/db/db';
import { Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';

function ImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState({ message: '', type: '' });

  const handleExport = async () => {
    try {
      const allResources = await db.resources.toArray();
      const allTags = await db.tags.toArray();
      const dataToExport = { resources: allResources, tags: allTags, exportedAt: new Date().toISOString(), version: 1 };
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linkvault_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data.');
    }
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus({ message: 'Importing...', type: 'info' });
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);
        if (!importedData?.resources || !importedData?.tags) throw new Error('Invalid export file format.');

        let resourcesAdded = 0, tagsAdded = 0, tagsSkipped = 0;

        for (const tag of importedData.tags) {
          const existingTag = await db.tags.where('name').equalsIgnoreCase(tag.name).first();
          if (!existingTag) {
            await db.tags.add({ name: tag.name, color: tag.color });
            tagsAdded++;
          } else {
            tagsSkipped++;
          }
        }

        const currentTags = await db.tags.toArray();
        const tagNameMap = new Map<string, number>(currentTags.map(tag => [tag.name, tag.id!]));

        for (const resource of importedData.resources) {
          const newTagIds = resource.tagIds.map((oldTagId: number) => {
            const oldTag = importedData.tags.find((t: Tag) => t.id === oldTagId);
            return oldTag ? tagNameMap.get(oldTag.name) : undefined;
          }).filter((id: number): id is number => id !== undefined);

          await db.resources.add({
            ...resource,
            tagIds: newTagIds,
            createdAt: new Date(resource.createdAt),
          });
          resourcesAdded++;
        }

        setImportStatus({
          message: `Import successful! Added ${resourcesAdded} resources and ${tagsAdded} new tags.`,
          type: 'success',
        });
      } catch (error: any) {
        setImportStatus({ message: `Import failed: ${error.message || 'Unknown error'}`, type: 'error' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const StatusIcon = () => {
    if (importStatus.type === 'success') return <CheckCircle className="h-5 w-5 text-green-400" />;
    if (importStatus.type === 'error') return <AlertCircle className="h-5 w-5 text-red-400" />;
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Export Data</h2>
        <p className="mt-2 text-sm text-slate-400">
          Download all your bookmarks and tags as a single JSON file. Keep it as a backup or transfer to another device.
        </p>
        <button
          onClick={handleExport}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <Download size={16} />
          Export Data
        </button>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Import Data</h2>
        <p className="mt-2 text-sm text-slate-400">
          Import bookmarks from a previously exported JSON file. Duplicates will be skipped.
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          <Upload size={16} />
          Import from File
        </button>
        <input
          type="file" accept=".json" ref={fileInputRef}
          onChange={handleImportFileChange} className="hidden"
        />
        {importStatus.message && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-800 p-3 text-sm">
            <StatusIcon />
            <span className={importStatus.type === 'error' ? 'text-red-400' : 'text-slate-300'}>
              {importStatus.message}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportExport;
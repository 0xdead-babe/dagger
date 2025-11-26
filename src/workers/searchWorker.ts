import type { Resource } from '@/db/db';

self.onmessage = (event: MessageEvent<{ resources: Resource[]; searchTerm: string; filterRead: boolean | undefined; filterTagIds: number[] }>) => {
  const { resources, searchTerm, filterRead, filterTagIds } = event.data;

  const filteredResources = resources.filter(resource => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const matchesSearch = resource.title.toLowerCase().includes(lowerCaseSearchTerm) ||
                          (resource.description?.toLowerCase().includes(lowerCaseSearchTerm));

    const matchesReadStatus = filterRead === undefined || resource.read === filterRead;

    const matchesTags = filterTagIds.length === 0 || filterTagIds.every(filterTagId => resource.tagIds.includes(filterTagId));

    return matchesSearch && matchesReadStatus && matchesTags;
  });

  self.postMessage(filteredResources);
};

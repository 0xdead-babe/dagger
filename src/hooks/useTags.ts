import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";

// Predefined palette of distinct colors
const DEFAULT_TAG_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#06b6d4', // cyan-500
  '#3b82f6', // blue-500 (current default)
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
];

export function useTags() {
  const tags = useLiveQuery(() => db.tags.toArray(), []);

  const generateUniqueColor = (existingTagColors: string[]): string => {
    for (const color of DEFAULT_TAG_COLORS) {
      if (!existingTagColors.includes(color)) {
        return color;
      }
    }
    // Fallback: If all default colors are used, generate a random hex color
    return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
  };

  // Function to get resource count for a specific tag
  const getResourceCountForTag = async (tagId: number): Promise<number> => {
    return await db.resources.where("tagIds").anyOf(tagId).count();
  };

  const getReadResourceCountForTag = async (tagId: number): Promise<number> => {
    return await db.resources.where("tagIds").anyOf(tagId).and(resource => resource.read === true).count();
  };

  const addTag = async (name: string, color: string) => {
    let finalColor = color;
    const existingTagColors = tags ? tags.map(tag => tag.color) : [];
    
    // If the color is the default blue or empty, assign a unique color
    if (!color || color === '#3b82f6') {
      finalColor = generateUniqueColor(existingTagColors);
    }
    await db.tags.add({ name, color: finalColor });
  };

  const updateTag = async (id: number, name: string, color: string) => {
    await db.tags.update(id, { name, color });
  };

  const deleteTag = async (id: number) => {
    // TODO: Implement logic to handle resources linked to this tag before deletion
    await db.tags.delete(id);
  };

  const getTagById = (id: number) => {
    return tags?.find((tag) => tag.id === id);
  };

  return {
    tags,
    addTag,
    updateTag,
    deleteTag,
    getTagById,
    getResourceCountForTag,
    getReadResourceCountForTag, // Export the new function
  };
}

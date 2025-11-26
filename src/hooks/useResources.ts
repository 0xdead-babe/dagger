import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import type { Resource } from "@/db/db";
export function useResources() {
  const resources = useLiveQuery(() => db.resources.toArray(), []);

  const addResource = async (resource: Omit<Resource, "id" | "createdAt">) => {
    await db.resources.add({ ...resource, createdAt: new Date() });
  };

  const updateResource = async (id: number, updates: Partial<Resource>) => {
    await db.resources.update(id, updates);
  };

  const deleteResource = async (id: number) => {
    await db.resources.delete(id);
  };

  const getResourceById = (id: number) => {
    return resources?.find((resource) => resource.id === id);
  };

  return {
    resources,
    addResource,
    updateResource,
    deleteResource,
    getResourceById,
  };
}

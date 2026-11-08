import { useContext } from "react";
import { TagsContext } from "@/contexts/tags-context";

export function useTags() {
  const context = useContext(TagsContext);
  if (!context) throw new Error("useTags must be used within a TagsProvider");
  return context;
}

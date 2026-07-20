export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  tagIds: string[];
  read?: boolean;
  pinned?: boolean;
  description?: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
}

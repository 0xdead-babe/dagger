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

export type TrashEntry =
  | {
      id: string;
      kind: "bookmark";
      deletedAt: number;
      bookmark: Bookmark;
    }
  | {
      id: string;
      kind: "tag";
      deletedAt: number;
      tag: Tag;
      affectedBookmarkIds: string[];
    };

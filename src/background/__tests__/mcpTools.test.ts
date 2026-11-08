// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db/client';

let executeMcpTool: typeof import('../index').executeMcpTool;

beforeAll(async () => {
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'test-extension',
      onInstalled: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
    commands: { onCommand: { addListener: vi.fn() } },
    action: { setBadgeText: vi.fn(), setBadgeBackgroundColor: vi.fn() },
  });
  ({ executeMcpTool } = await import('../index'));
});

afterAll(() => vi.unstubAllGlobals());

beforeEach(async () => {
  await db.bookmarks.clear();
  await db.tags.clear();
  await db.trash.clear();
});

describe('MCP bookmark tools', () => {
  it('returns no bookmarks for an empty search or page beyond the end', async () => {
    await db.bookmarks.add({
      id: 'one', url: 'https://example.com', title: 'Example', tagIds: [],
      createdAt: 1, updatedAt: 1,
    });

    expect(await executeMcpTool('search_bookmarks', { query: 'absent' })).toEqual([]);
    expect(await executeMcpTool('list_bookmarks', { limit: 10, offset: 1 })).toEqual([]);
    expect((await executeMcpTool('list_bookmarks', { read: false })) as Array<{ id: string }>).toMatchObject([{ id: 'one' }]);
  });

  it('preserves newest-first order after resolving tags', async () => {
    await db.bookmarks.bulkAdd([
      { id: 'older', url: 'https://old.example', title: 'Old', tagIds: [], createdAt: 1, updatedAt: 1 },
      { id: 'newer', url: 'https://new.example', title: 'New', tagIds: [], createdAt: 2, updatedAt: 2 },
    ]);

    const result = await executeMcpTool('list_bookmarks', { limit: 10 }) as Array<{ id: string }>;
    expect(result.map(bookmark => bookmark.id)).toEqual(['newer', 'older']);
  });

  it('creates usable tag references and reuses tags case insensitively', async () => {
    const created = await executeMcpTool('add_bookmark', {
      url: 'https://example.com', tagNames: ['Research', 'research'],
    }) as { id: string; tags: string[] };
    expect(created.tags).toEqual(['Research']);

    const bookmark = await db.bookmarks.get(created.id);
    const tags = await db.tags.toArray();
    expect(tags).toHaveLength(1);
    expect(bookmark?.tagIds).toEqual([tags[0].id]);

    await executeMcpTool('update_bookmark', { id: created.id, tagNames: ['RESEARCH'] });
    expect(await db.tags.count()).toBe(1);
    expect((await db.bookmarks.get(created.id))?.tagIds).toEqual([tags[0].id]);
  });

  it('rejects unsafe bookmark URLs before saving', async () => {
    await expect(executeMcpTool('add_bookmark', { url: 'javascript:alert(1)' })).rejects.toThrow('HTTP or HTTPS');
    expect(await db.bookmarks.count()).toBe(0);
  });

  it('moves deleted bookmarks to Trash and restores them through MCP', async () => {
    await db.bookmarks.add({ id: 'recoverable', url: 'https://example.com', title: 'Recoverable', tagIds: [], createdAt: 1, updatedAt: 1 });
    expect(await executeMcpTool('delete_bookmark', { id: 'recoverable' })).toEqual({ success: true, deletedId: 'recoverable', trashedId: 'recoverable' });
    const entries = await executeMcpTool('list_trash', {}) as Array<{ id: string; kind: string }>;
    expect(entries).toHaveLength(1);
    expect(entries[0].kind).toBe('bookmark');
    await executeMcpTool('restore_trash_item', { id: entries[0].id });
    expect((await db.bookmarks.get('recoverable'))?.title).toBe('Recoverable');
    expect(await db.trash.count()).toBe(0);
  });
});

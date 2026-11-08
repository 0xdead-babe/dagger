import { db } from "../db/client";
import Dexie from "dexie";
import { addBookmark, updateBookmark, deleteBookmark } from "../db/bookmarks";
import { addTag } from "../db/tags";
import { restoreTrashEntry } from "../db/trash";
import type { Bookmark } from "../types/entities";

async function updateBadgeCount() {
  try {
    const count = await db.bookmarks.filter(b => !b.read).count();
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#E2622E' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.error("Failed to update badge count:", err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Dagger Extension Installed");
  updateBadgeCount();
});

let badgeUpdateTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleBadgeUpdate() {
  if (badgeUpdateTimer) clearTimeout(badgeUpdateTimer);
  badgeUpdateTimer = setTimeout(() => {
    badgeUpdateTimer = null;
    updateBadgeCount();
  }, 100);
}

Dexie.on.storagemutated.subscribe(scheduleBadgeUpdate);

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "add-current-page") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      const tabId = activeTab?.id;
      if (!activeTab || !activeTab.url || !tabId) return;

      const openFallback = () => {
        const popupUrl = chrome.runtime.getURL('index.html') +
          `?action=add&url=${encodeURIComponent(activeTab.url!)}&title=${encodeURIComponent(activeTab.title || '')}`;
        chrome.windows.create({
          url: popupUrl,
          type: 'popup',
          width: 520,
          height: 650,
          focused: true,
        });
      };

      chrome.tabs.sendMessage(tabId, {
        type: 'OPEN_ADD_BOOKMARK',
        url: activeTab.url,
        title: activeTab.title
      }).catch(() => {
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        }).then(() => {
          return chrome.tabs.sendMessage(tabId, {
            type: 'OPEN_ADD_BOOKMARK',
            url: activeTab.url,
            title: activeTab.title
          });
        }).catch((err) => {
          console.warn("Could not inject overlay, falling back to popup window:", err);
          openFallback();
        });
      });
    });
  } else if (command === "open-command-palette") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      const openFallback = () => {
        const popupUrl = chrome.runtime.getURL('index.html') + `?action=command-palette`;
        chrome.windows.create({
          url: popupUrl,
          type: 'popup',
          width: 520,
          height: 650,
          focused: true,
        });
      };

      chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_COMMAND_PALETTE' }).catch(() => {
        // Ping failed, meaning content script isn't loaded on this tab yet (e.g., an old tab).
        // Try injecting it dynamically.
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        }).then(() => {
          // Injection succeeded, send the toggle command again
          return chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_COMMAND_PALETTE' });
        }).catch((err) => {
          // Injection failed (e.g. on restricted chrome:// urls), fallback to popup
          console.warn("Could not inject overlay, falling back to popup window:", err);
          openFallback();
        });
      });
    });
  } else if (command === "add-all-tabs") {
    chrome.tabs.query({ currentWindow: true }, async (tabs) => {
      let savedCount = 0;
      for (const tab of tabs) {
        // Exclude extension pages, internal pages, and ensure valid HTTP/HTTPS URLs
        if (
          tab.url && 
          (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
          !tab.url.includes(chrome.runtime.id)
        ) {
          try {
            await addBookmark({
              url: tab.url,
              title: tab.title || tab.url,
              tagIds: [],
              read: false,
            });
            savedCount++;
          } catch (err) {
            console.error("Failed to bulk save tab:", tab.url, err);
          }
        }
      }
      
      if (savedCount > 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon-128.png',
          title: 'Dagger',
          message: `Successfully saved ${savedCount} open tabs!`
        });
      } else {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon-128.png',
          title: 'Dagger',
          message: `No valid web pages found to save.`
        });
      }
    });
  }
});

// Message listener for title fetching and other background tasks
chrome.runtime.onMessage.addListener((request: { type: string; payload?: unknown }, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
  if (!request || typeof request !== 'object') return;
  if (request.type === 'BADGE_REFRESH') {
    if (sender.id === chrome.runtime.id) scheduleBadgeUpdate();
    return;
  }
  if (request.type === "FETCH_TITLE") {
    const url = (request.payload as { url?: unknown } | undefined)?.url;
    if (typeof url !== 'string' || !isWebUrl(url)) {
      sendResponse({ title: null, error: 'Invalid URL' });
      return;
    }

    fetch(url, { signal: AbortSignal.timeout(5000) })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.text();
      })
      .then((html) => {
        // Use a regex to extract the <title> tag's inner text
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match && match[1]) {
          sendResponse({ title: match[1].trim() });
        } else {
          sendResponse({ title: null });
        }
      })
      .catch((error) => {
        console.error("Background fetch title error:", error);
        sendResponse({ title: null, error: error.message });
      });

    // Return true to indicate we wish to send a response asynchronously
    return true;
  }
  if (request.type === "MCP_CONNECT" || request.type === "MCP_DISCONNECT" || request.type === "MCP_STATUS") {
    if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) {
      sendResponse({ success: false, error: 'Extension page required' });
      return;
    }
  }
  if (request.type === "MCP_CONNECT") {
    const payload = request.payload as { url?: unknown; token?: unknown } | undefined;
    sendResponse({ success: connectWebSocket(payload?.url, payload?.token) });
    return;
  }
  if (request.type === "MCP_DISCONNECT") {
    connectionError = '';
    killConnection();
    sendResponse({ success: true });
    return;
  }
  if (request.type === "MCP_STATUS") {
    sendResponse({ state: connectionState, error: connectionError, url: mcpUrl });
    return;
  }
});

let ws: WebSocket | null = null;
let mcpUrl = '';
let connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
let connectionError = '';
let handshakeTimer: ReturnType<typeof setTimeout> | null = null;

function isWebUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function publishMcpState() {
  chrome.runtime.sendMessage({ type: 'MCP_STATE_CHANGED', payload: { state: connectionState, error: connectionError, url: mcpUrl } }).catch(() => {});
}

function killConnection() {
  if (handshakeTimer) clearTimeout(handshakeTimer);
  handshakeTimer = null;
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  connectionState = 'disconnected';
  publishMcpState();
}

function connectWebSocket(url: unknown, token: unknown): boolean {
  killConnection();
  if (typeof url !== 'string' || typeof token !== 'string' || token.length < 16) {
    connectionError = 'Enter a valid proxy URL and pairing token';
    publishMcpState();
    return false;
  }
  let socketUrl = url;
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== 'ws:' || !['localhost', '127.0.0.1'].includes(endpoint.hostname)) {
      throw new Error('Use a local ws://localhost or ws://127.0.0.1 proxy URL');
    }
    if (endpoint.protocol === 'ws:' && endpoint.hostname === 'localhost') {
      endpoint.hostname = '127.0.0.1';
      socketUrl = endpoint.toString();
    }
  } catch (error) {
    connectionError = error instanceof Error ? error.message : 'Invalid proxy URL';
    publishMcpState();
    return false;
  }
  mcpUrl = url;
  connectionState = 'connecting';
  connectionError = '';
  publishMcpState();

  try {
    const socket = new WebSocket(socketUrl);
    ws = socket;

    handshakeTimer = setTimeout(() => {
      if (ws === socket && connectionState === 'connecting') {
        connectionError = 'Handshake timeout. Is this a valid Dagger MCP Proxy?';
        killConnection();
      }
    }, 5000);

    socket.onopen = () => {
      if (ws !== socket) return;
      console.log("[MCP Bridge] Connected to proxy server, sending handshake");
      socket.send(JSON.stringify({ type: 'handshake', client: 'dagger-extension', token }));
    };

    socket.onmessage = async (event) => {
      if (ws !== socket) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'handshake_error') {
          if (handshakeTimer) clearTimeout(handshakeTimer);
          handshakeTimer = null;
          connectionError = typeof data.error === 'string' ? data.error : 'Handshake failed';
          killConnection();
          return;
        }
        if (data.type === 'handshake_ack' && data.server === 'dagger-mcp-proxy') {
          if (handshakeTimer) clearTimeout(handshakeTimer);
          handshakeTimer = null;
          connectionState = 'connected';
          publishMcpState();
          console.log("[MCP Bridge] Handshake successful");
          return;
        }

        if (connectionState !== 'connected') return;

        if (data.type === 'heartbeat') {
          socket.send(JSON.stringify({ type: 'heartbeat_ack' }));
          return;
        }

        if (data.type === 'request' && typeof data.id === 'string' && typeof data.tool === 'string' && data.args && typeof data.args === 'object' && !Array.isArray(data.args)) {
          const { id, tool, args } = data;
          try {
            const payload = await executeMcpTool(tool, args);
            if (ws === socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'response', id, payload }));
          } catch (e) {
            if (ws === socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'response', id, error: e instanceof Error ? e.message : 'Unknown error' }));
          }
        }
      } catch (err) {
        console.error("[MCP Bridge] Error processing message", err);
      }
    };

    socket.onclose = () => {
      if (ws !== socket) return;
      if (handshakeTimer) clearTimeout(handshakeTimer);
      handshakeTimer = null;
      if (connectionState !== 'disconnected') {
        console.log("[MCP Bridge] Disconnected from proxy server");
        connectionState = 'disconnected';
        connectionError = connectionError || 'Connection closed by server';
        publishMcpState();
        ws = null;
      }
    };

    socket.onerror = (err) => {
      if (ws !== socket) return;
      console.error("[MCP Bridge] WebSocket error", err);
      connectionError = 'WebSocket connection failed';
    };
  } catch (err) {
    connectionError = err instanceof Error ? err.message : 'Error creating WebSocket';
    killConnection();
    return false;
  }
  return true;
}

const getBookmarksWithResolvedTags = async (bookmarks: Bookmark[]) => {
  if (bookmarks.length === 0) return [];
  const allTags = await db.tags.toArray();
  const tagMap = new Map(allTags.map(tag => [tag.id, tag.name]));

  return bookmarks.map(bookmark => ({
    ...bookmark,
    tags: bookmark.tagIds.map(tagId => tagMap.get(tagId)).filter(Boolean) as string[],
  }));
};

async function resolveTagIds(tagNames: string[]): Promise<string[]> {
  const tags = await db.tags.toArray();
  const byName = new Map(tags.map(tag => [tag.name.toLocaleLowerCase(), tag.id]));
  const ids = new Set<string>();
  for (const rawName of tagNames) {
    const name = rawName.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase();
    let id = byName.get(key);
    if (!id) {
      id = await addTag({ name });
      byName.set(key, id);
    }
    ids.add(id);
  }
  return [...ids];
}

export async function executeMcpTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  if (toolName === 'search_bookmarks') {
    const { query, read, tagNames, limit = 10 } = args as { query?: string, read?: boolean, tagNames?: string[], limit?: number };
    let filteredBookmarks: Bookmark[] = await db.bookmarks.orderBy('createdAt').reverse().toArray();

    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      filteredBookmarks = filteredBookmarks.filter(b =>
        (typeof b.title === 'string' && b.title.toLowerCase().includes(lowerCaseQuery)) ||
        (typeof b.url === 'string' && b.url.toLowerCase().includes(lowerCaseQuery)) ||
        (typeof b.description === 'string' && b.description.toLowerCase().includes(lowerCaseQuery))
      );
    }

    if (read !== undefined) {
      filteredBookmarks = filteredBookmarks.filter(b => Boolean(b.read) === read);
    }

    if (tagNames && tagNames.length > 0) {
      const tagsToFilter = await db.tags.toArray();
      const names = new Set(tagNames.map(name => name.toLocaleLowerCase()));
      const tagIdsToFilter = new Set(
        tagsToFilter
          .filter(t => names.has(t.name.toLocaleLowerCase()))
          .map(t => t.id)
      );
      filteredBookmarks = filteredBookmarks.filter(b =>
        b.tagIds.some(tagId => tagIdsToFilter.has(tagId))
      );
    }

    filteredBookmarks = filteredBookmarks.slice(0, limit);
    return await getBookmarksWithResolvedTags(filteredBookmarks);
  }

  if (toolName === 'list_bookmarks') {
    const { limit = 10, offset = 0, read, tagNames } = args as { limit?: number, offset?: number, read?: boolean, tagNames?: string[] };
    let collection = db.bookmarks.orderBy('createdAt').reverse();

    if (read !== undefined) {
      collection = collection.filter(b => Boolean(b.read) === read);
    }

    if (tagNames && tagNames.length > 0) {
      const tagsToFilter = await db.tags.toArray();
      const names = new Set(tagNames.map(name => name.toLocaleLowerCase()));
      const tagIdsToFilter = new Set(
        tagsToFilter
          .filter(t => names.has(t.name.toLocaleLowerCase()))
          .map(t => t.id)
      );
      collection = collection.filter(b =>
        b.tagIds.some(tagId => tagIdsToFilter.has(tagId))
      );
    }

    const bookmarks = await collection.offset(offset).limit(limit).toArray();
    return await getBookmarksWithResolvedTags(bookmarks);
  }

  if (toolName === 'add_bookmark') {
    const { url, title, description, tagNames, read = false } = args as { url: string, title?: string, description?: string, tagNames?: string[], read?: boolean };
    if (!isWebUrl(url)) throw new Error('Bookmark URL must use HTTP or HTTPS');
    const bookmarkId = await db.transaction('rw', db.bookmarks, db.tags, async () => {
      const resolvedTagIds = await resolveTagIds(tagNames ?? []);
      return addBookmark({
        url,
        title: title?.trim() || url,
        description,
        tagIds: resolvedTagIds,
        read,
      });
    });
    const newBookmark = await db.bookmarks.get(bookmarkId);
    return (await getBookmarksWithResolvedTags(newBookmark ? [newBookmark] : []))[0];
  }

  if (toolName === 'delete_bookmark') {
    const { id } = args as { id: string };
    const existing = await db.bookmarks.get(id);
    if (!existing) throw new Error(`Bookmark with id '${id}' not found`);
    await deleteBookmark(id);
    return { success: true, deletedId: id, trashedId: id };
  }

  if (toolName === 'list_trash') {
    const { limit = 20, offset = 0 } = args as { limit?: number, offset?: number };
    return db.trash.orderBy('deletedAt').reverse().offset(offset).limit(limit).toArray();
  }

  if (toolName === 'restore_trash_item') {
    const { id } = args as { id: string };
    await restoreTrashEntry(id);
    return { success: true, restoredTrashId: id };
  }

  if (toolName === 'update_bookmark') {
    const { id, title, description, url, read, pinned, tagNames } = args as { id: string, title?: string, description?: string, url?: string, read?: boolean, pinned?: boolean, tagNames?: string[] };
    const existing = await db.bookmarks.get(id);
    if (!existing) throw new Error(`Bookmark with id '${id}' not found`);

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (url !== undefined) {
      if (!isWebUrl(url)) throw new Error('Bookmark URL must use HTTP or HTTPS');
      updates.url = url;
    }
    if (read !== undefined) updates.read = read;
    if (pinned !== undefined) updates.pinned = pinned;

    await db.transaction('rw', db.bookmarks, db.tags, async () => {
      if (tagNames !== undefined) updates.tagIds = await resolveTagIds(tagNames);
      await updateBookmark(id, updates);
    });
    const updated = await db.bookmarks.get(id);
    return (await getBookmarksWithResolvedTags(updated ? [updated] : []))[0];
  }

  if (toolName === 'list_tags') {
    return await db.tags.toArray();
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

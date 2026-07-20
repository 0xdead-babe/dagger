import { db } from "../db/client";
import { addBookmark, updateBookmark, deleteBookmark } from "../db/bookmarks";
import { addTag } from "../db/tags";
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

db.bookmarks.hook('creating', () => { updateBadgeCount(); });
db.bookmarks.hook('updating', () => { updateBadgeCount(); });
db.bookmarks.hook('deleting', () => { updateBadgeCount(); });

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "add-current-page") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.url) {
        const popupUrl = chrome.runtime.getURL('index.html') + 
          `?action=add&url=${encodeURIComponent(activeTab.url)}&title=${encodeURIComponent(activeTab.title || '')}`;
        chrome.windows.create({
          url: popupUrl,
          type: 'popup',
          width: 520,
          height: 650,
          focused: true,
        });
      }
    });
  }
});

// Message listener for title fetching and other background tasks
chrome.runtime.onMessage.addListener((request: { type: string; payload?: any }, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
  if (request.type === "FETCH_TITLE") {
    const { url } = request.payload;

    fetch(url)
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
  if (request.type === "MCP_CONNECT") {
    connectWebSocket(request.payload.url, request.payload.token);
    sendResponse({ success: true });
    return true;
  }
  if (request.type === "MCP_DISCONNECT") {
    killConnection();
    sendResponse({ success: true });
    return true;
  }
  if (request.type === "MCP_STATUS") {
    sendResponse({ state: connectionState, error: connectionError, url: mcpUrl });
    return true;
  }
});

// --- MCP WebSocket Bridge ---
let ws: WebSocket | null = null;
let mcpUrl = '';
let connectionState = 'disconnected'; // 'connecting', 'connected', 'disconnected'
let connectionError = '';

function killConnection() {
  if (ws) {
    ws.onclose = null; 
    ws.close();
    ws = null;
  }
  connectionState = 'disconnected';
  // Keep the previous error if it was a failure, otherwise clear it if manually disconnected
  chrome.runtime.sendMessage({ type: 'MCP_STATE_CHANGED', payload: { state: connectionState, error: connectionError, url: mcpUrl } }).catch(() => {});
}

function connectWebSocket(url: string, token: string = '') {
  killConnection();
  mcpUrl = url;
  connectionState = 'connecting';
  connectionError = '';
  chrome.runtime.sendMessage({ type: 'MCP_STATE_CHANGED', payload: { state: connectionState, error: connectionError, url: mcpUrl } }).catch(() => {});

  try {
    ws = new WebSocket(url);
    
    const handshakeTimeout = setTimeout(() => {
      if (ws && connectionState === 'connecting') {
        connectionError = 'Handshake timeout. Is this a valid Dagger MCP Proxy?';
        killConnection();
      }
    }, 5000);

    ws.onopen = () => {
      console.log("[MCP Bridge] Connected to proxy server, sending handshake");
      ws?.send(JSON.stringify({ type: 'handshake', client: 'dagger-extension', token }));
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'handshake_error') {
          clearTimeout(handshakeTimeout);
          connectionError = data.error || 'Handshake failed';
          killConnection();
          return;
        }
        if (data.type === 'handshake_ack' && data.server === 'dagger-mcp-proxy') {
          clearTimeout(handshakeTimeout);
          connectionState = 'connected';
          chrome.runtime.sendMessage({ type: 'MCP_STATE_CHANGED', payload: { state: connectionState, error: '', url: mcpUrl } }).catch(() => {});
          console.log("[MCP Bridge] Handshake successful");
          return;
        }

        if (connectionState !== 'connected') return;

        if (data.type === 'request' && data.id) {
          const { id, tool, args } = data;
          let payload;
          try {
            payload = await executeMcpTool(tool, args);
            ws?.send(JSON.stringify({ type: 'response', id, payload }));
          } catch (e) {
            ws?.send(JSON.stringify({ type: 'response', id, error: e instanceof Error ? e.message : 'Unknown error' }));
          }
        }
      } catch (err) {
        console.error("[MCP Bridge] Error processing message", err);
      }
    };

    ws.onclose = () => {
      clearTimeout(handshakeTimeout);
      if (connectionState !== 'disconnected') {
        console.log("[MCP Bridge] Disconnected from proxy server");
        connectionState = 'disconnected';
        connectionError = connectionError || 'Connection closed by server';
        chrome.runtime.sendMessage({ type: 'MCP_STATE_CHANGED', payload: { state: connectionState, error: connectionError, url: mcpUrl } }).catch(() => {});
        ws = null;
      }
    };

    ws.onerror = (err) => {
      clearTimeout(handshakeTimeout);
      console.error("[MCP Bridge] WebSocket error", err);
      connectionError = 'WebSocket connection failed';
    };
  } catch (err) {
    connectionError = err instanceof Error ? err.message : 'Error creating WebSocket';
    killConnection();
  }
}

// --- MCP Tool Handlers ---
const getBookmarksWithResolvedTags = async (bookmarkIds?: string[]) => {
  let bookmarksToFetch: Bookmark[] = [];
  if (bookmarkIds && bookmarkIds.length > 0) {
    bookmarksToFetch = await db.bookmarks.where('id').anyOf(bookmarkIds).toArray();
  } else {
    bookmarksToFetch = await db.bookmarks.toArray();
  }
  
  const allTags = await db.tags.toArray();
  const tagMap = new Map(allTags.map(tag => [tag.id, tag.name]));

  return bookmarksToFetch.map(bookmark => ({
    ...bookmark,
    tags: bookmark.tagIds.map(tagId => tagMap.get(tagId)).filter(Boolean) as string[],
  }));
};

async function executeMcpTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  if (toolName === 'search_bookmarks') {
    const { query, read, tagNames, limit = 10 } = args as { query?: string, read?: boolean, tagNames?: string[], limit?: number };
    let filteredBookmarks: Bookmark[] = await db.bookmarks.toArray();

    if (query) {
      const lowerCaseQuery = query.toLowerCase();
      filteredBookmarks = filteredBookmarks.filter(b =>
        b.title.toLowerCase().includes(lowerCaseQuery) ||
        b.url.toLowerCase().includes(lowerCaseQuery) ||
        b.description?.toLowerCase().includes(lowerCaseQuery)
      );
    }

    if (read !== undefined) {
      filteredBookmarks = filteredBookmarks.filter(b => b.read === read);
    }

    if (tagNames && tagNames.length > 0) {
      const tagsToFilter = await db.tags.toArray();
      const tagIdsToFilter = new Set(
        tagsToFilter
          .filter(t => tagNames.map((n: string) => n.toLowerCase()).includes(t.name.toLowerCase()))
          .map(t => t.id)
      );
      filteredBookmarks = filteredBookmarks.filter(b =>
        b.tagIds.some(tagId => tagIdsToFilter.has(tagId))
      );
    }

    filteredBookmarks = filteredBookmarks.slice(0, limit);
    return await getBookmarksWithResolvedTags(filteredBookmarks.map(b => b.id));
  }
  
  if (toolName === 'list_bookmarks') {
    const { limit = 10, offset = 0, read, tagNames } = args as { limit?: number, offset?: number, read?: boolean, tagNames?: string[] };
    let collection = db.bookmarks.orderBy('createdAt').reverse();

    if (read !== undefined) {
      collection = collection.filter(b => b.read === read);
    }

    if (tagNames && tagNames.length > 0) {
      const tagsToFilter = await db.tags.toArray();
      const tagIdsToFilter = new Set(
        tagsToFilter
          .filter(t => tagNames.map((n: string) => n.toLowerCase()).includes(t.name.toLowerCase()))
          .map(t => t.id)
      );
      collection = collection.filter(b =>
        b.tagIds.some(tagId => tagIdsToFilter.has(tagId))
      );
    }

    const bookmarks = await collection.offset(offset).limit(limit).toArray();
    return await getBookmarksWithResolvedTags(bookmarks.map(b => b.id));
  }
  
  if (toolName === 'add_bookmark') {
    const { url, title, description, tagNames, read = false } = args as { url: string, title?: string, description?: string, tagNames?: string[], read?: boolean };
    
    let finalTitle = title;
    if (!finalTitle) {
      try {
        const fetchedTitle = await fetch(url).then(res => res.text()).then(text => {
          const match = /<title[^>]*>([^<]+)<\/title>/i.exec(text);
          return match ? match[1].trim() : url;
        });
        finalTitle = fetchedTitle;
      } catch {
        finalTitle = url;
      }
    }

    const resolvedTagIds: string[] = [];
    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        const tags = await db.tags.toArray();
        let tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        if (!tag) {
          const tagId = crypto.randomUUID();
          tag = { id: tagId, name: tagName, createdAt: Date.now() };
          await addTag(tag);
        }
        resolvedTagIds.push(tag.id as string);
      }
    }

    const bookmarkId = await addBookmark({
      url,
      title: finalTitle,
      description,
      tagIds: resolvedTagIds,
      read,
    });
    const newBookmark = await db.bookmarks.get(bookmarkId);
    return (await getBookmarksWithResolvedTags([newBookmark!.id]))[0];
  }

  if (toolName === 'delete_bookmark') {
    const { id } = args as { id: string };
    const existing = await db.bookmarks.get(id);
    if (!existing) throw new Error(`Bookmark with id '${id}' not found`);
    await deleteBookmark(id);
    return { success: true, deletedId: id };
  }

  if (toolName === 'update_bookmark') {
    const { id, title, description, url, read, pinned, tagNames } = args as { id: string, title?: string, description?: string, url?: string, read?: boolean, pinned?: boolean, tagNames?: string[] };
    const existing = await db.bookmarks.get(id);
    if (!existing) throw new Error(`Bookmark with id '${id}' not found`);
    
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (url !== undefined) updates.url = url;
    if (read !== undefined) updates.read = read;
    if (pinned !== undefined) updates.pinned = pinned;
    
    if (tagNames !== undefined) {
      const resolvedTagIds: string[] = [];
      for (const tagName of tagNames) {
        const tags = await db.tags.toArray();
        let tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        if (!tag) {
          const tagId = crypto.randomUUID();
          tag = { id: tagId, name: tagName, createdAt: Date.now() };
          await addTag(tag);
        }
        resolvedTagIds.push(tag.id as string);
      }
      updates.tagIds = resolvedTagIds;
    }
    
    await updateBookmark(id, updates);
    const updated = await db.bookmarks.get(id);
    return (await getBookmarksWithResolvedTags([updated!.id]))[0];
  }

  if (toolName === 'list_tags') {
    return await db.tags.toArray();
  }

  throw new Error(`Unknown tool: ${toolName}`);
}

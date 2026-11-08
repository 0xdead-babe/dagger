import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import crypto from 'crypto';

const WSS_PORT = 3004;
const REQUEST_TIMEOUT_MS = 10000;
const HANDSHAKE_TIMEOUT_MS = 5000;
const bookmarkUrl = z.url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
}, 'Bookmark URL must use HTTP or HTTPS');
const expectedToken = process.env.DAGGER_TOKEN;

if (!expectedToken || expectedToken.length < 16) {
  console.error('[MCP Proxy] Set DAGGER_TOKEN to the pairing token shown in Dagger settings before starting the proxy.');
  process.exit(1);
}

const wss = new WebSocketServer({ host: '127.0.0.1', port: WSS_PORT, maxPayload: 1024 * 1024 });
let extensionSocket: WebSocket | null = null;

const pendingRequests = new Map<string, {
  socket: WebSocket;
  resolve: (val: unknown) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}>();

function rejectPending(socket: WebSocket, reason: string) {
  for (const [id, pending] of pendingRequests) {
    if (pending.socket !== socket) continue;
    clearTimeout(pending.timeout);
    pendingRequests.delete(id);
    pending.reject(new Error(reason));
  }
}

wss.on('connection', (ws) => {
  let authenticated = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const handshakeTimeout = setTimeout(() => ws.close(1008, 'Handshake required'), HANDSHAKE_TIMEOUT_MS);

  ws.on('message', (message) => {
    try {
      const data: unknown = JSON.parse(message.toString());
      if (!data || typeof data !== 'object') return;
      const envelope = data as Record<string, unknown>;

      if (!authenticated) {
        if (envelope.type !== 'handshake' || envelope.client !== 'dagger-extension' || typeof envelope.token !== 'string') {
          ws.close(1008, 'Invalid handshake');
          return;
        }
        const supplied = Buffer.from(envelope.token);
        const expected = Buffer.from(expectedToken);
        if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
          ws.send(JSON.stringify({ type: 'handshake_error', error: 'Invalid pairing token. Please update DAGGER_TOKEN.' }), () => ws.close(1008, 'Invalid token'));
          return;
        }
        if (extensionSocket && extensionSocket.readyState === WebSocket.OPEN) {
          ws.close(1008, 'Extension already connected');
          return;
        }
        clearTimeout(handshakeTimeout);
        authenticated = true;
        extensionSocket = ws;
        console.error('[MCP Proxy] Extension authenticated');
        ws.send(JSON.stringify({ type: 'handshake_ack', server: 'dagger-mcp-proxy' }));
        heartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'heartbeat' }));
        }, 20000);
        return;
      }

      if (envelope.type === 'response' && typeof envelope.id === 'string') {
        const pending = pendingRequests.get(envelope.id);
        if (pending && pending.socket === ws) {
          clearTimeout(pending.timeout);
          pendingRequests.delete(envelope.id);
          if (typeof envelope.error === 'string') {
            pending.reject(new Error(envelope.error));
          } else {
            pending.resolve(envelope.payload);
          }
        }
      }
    } catch (e) {
      console.error('[MCP Proxy] Error parsing message', e);
      ws.close(1003, 'Invalid message');
    }
  });

  ws.on('close', () => {
    clearTimeout(handshakeTimeout);
    clearInterval(heartbeat);
    rejectPending(ws, 'Extension disconnected');
    if (extensionSocket === ws) {
      extensionSocket = null;
      console.error('[MCP Proxy] Extension disconnected');
    }
  });
  ws.on('error', (error) => console.error('[MCP Proxy] WebSocket error', error));
});

wss.on('listening', () => console.error(`[MCP Proxy] WebSocket server listening on 127.0.0.1:${WSS_PORT}`));
wss.on('error', (error) => {
  console.error('[MCP Proxy] WebSocket server error', error);
  process.exit(1);
});

async function executeInExtension(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const socket = extensionSocket;
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error('Extension is not connected to the proxy');
  }

  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error('Request to extension timed out'));
    }, REQUEST_TIMEOUT_MS);
    pendingRequests.set(id, { socket, resolve, reject, timeout });
    socket.send(JSON.stringify({
      type: 'request',
      id,
      tool: toolName,
      args
    }), (error) => {
      if (error && pendingRequests.delete(id)) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  });
}

const server = new McpServer({
  name: 'dagger-bookmark-manager',
  version: '1.0.0',
});

server.tool(
  'search_bookmarks',
  'Search bookmarks by a query string, read status, and tags.',
  {
    query: z.string().optional().describe('Search query string for title, URL, or description.'),
    read: z.boolean().optional().describe('Filter by read status (true for read, false for unread).'),
    tagNames: z.array(z.string()).optional().describe('Filter by an array of tag names.'),
    limit: z.number().int().min(1).max(100).default(10).describe('Maximum number of results to return (default: 10, max: 100).'),
  },
  async (args) => {
    const result = await executeInExtension('search_bookmarks', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

server.tool(
  'list_bookmarks',
  'List all bookmarks with pagination support. Can also filter by read status and tags.',
  {
    limit: z.number().int().min(1).max(100).default(10).describe('Maximum number of results to return (default: 10, max: 100).'),
    offset: z.number().int().min(0).default(0).describe('Number of results to skip (for pagination).'),
    read: z.boolean().optional().describe('Filter by read status (true for read, false for unread).'),
    tagNames: z.array(z.string()).optional().describe('Filter by an array of tag names.'),
  },
  async (args) => {
    const result = await executeInExtension('list_bookmarks', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

server.tool(
  'add_bookmark',
  'Add a new bookmark. Creates tags if they do not exist. Returns the newly created bookmark.',
  {
    url: bookmarkUrl.describe('The HTTP or HTTPS URL of the bookmark.'),
    title: z.string().optional().describe('The title of the bookmark.'),
    description: z.string().optional().describe('A description for the bookmark.'),
    tagNames: z.array(z.string()).optional().describe("An array of tag names to associate with the bookmark. Tags will be created if they don't exist."),
    read: z.boolean().default(false).describe('Whether the bookmark has been read (default: false).'),
  },
  async (args) => {
    const result = await executeInExtension('add_bookmark', args);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

server.tool(
  'list_tags',
  'List all available tags with their ID and name.',
  {},
  async () => {
    const result = await executeInExtension('list_tags', {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

server.tool(
  'delete_bookmark',
  'Move a bookmark to Trash by its ID. It can be restored later.',
  {
    id: z.string().describe('The ID of the bookmark to delete.'),
  },
  async (args) => {
    const result = await executeInExtension('delete_bookmark', args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'list_trash',
  'List deleted bookmarks and tags available for restoration.',
  {
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  },
  async (args) => {
    const result = await executeInExtension('list_trash', args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'restore_trash_item',
  'Restore a deleted bookmark or tag using its Trash item ID.',
  { id: z.string().min(1) },
  async (args) => {
    const result = await executeInExtension('restore_trash_item', args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  'update_bookmark',
  'Update an existing bookmark. Only provided fields will be updated.',
  {
    id: z.string().describe('The ID of the bookmark to update.'),
    title: z.string().optional().describe('New title for the bookmark.'),
    description: z.string().optional().describe('New description.'),
    url: bookmarkUrl.optional().describe('New HTTP or HTTPS URL.'),
    read: z.boolean().optional().describe('Set read status.'),
    pinned: z.boolean().optional().describe('Set pinned status.'),
    tagNames: z.array(z.string()).optional().describe('Replace tags with these tag names. Tags will be created if they don\'t exist.'),
  },
  async (args) => {
    const result = await executeInExtension('update_bookmark', args);
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  }
);

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.error('[MCP Proxy] MCP Server listening on stdio');
}).catch((error) => {
  console.error('[MCP Proxy] Failed to start MCP Server', error);
  process.exit(1);
});

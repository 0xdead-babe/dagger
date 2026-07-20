import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';
import crypto from 'crypto';

const WSS_PORT = 3004;

const wss = new WebSocketServer({ port: WSS_PORT });
let extensionSocket: WebSocket | null = null;

const pendingRequests = new Map<string, { resolve: (val: unknown) => void; reject: (err: Error) => void }>();

wss.on('connection', (ws) => {
  console.error('[MCP Proxy] Extension connected');
  extensionSocket = ws;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'handshake' && data.client === 'dagger-extension') {
        const expectedToken = process.env.DAGGER_TOKEN;
        if (expectedToken && data.token !== expectedToken) {
          ws.send(JSON.stringify({ type: 'handshake_error', error: 'Invalid pairing token. Please update DAGGER_TOKEN.' }));
          ws.close();
          return;
        }
        ws.send(JSON.stringify({ type: 'handshake_ack', server: 'dagger-mcp-proxy' }));
        return;
      }
      if (data.type === 'response' && data.id) {
        const p = pendingRequests.get(data.id);
        if (p) {
          if (data.error) {
            p.reject(new Error(data.error));
          } else {
            p.resolve(data.payload);
          }
          pendingRequests.delete(data.id);
        }
      }
    } catch (e) {
      console.error('[MCP Proxy] Error parsing message', e);
    }
  });

  ws.on('close', () => {
    console.error('[MCP Proxy] Extension disconnected');
    if (extensionSocket === ws) {
      extensionSocket = null;
    }
  });
});

console.error(`[MCP Proxy] WebSocket server listening on port ${WSS_PORT}`);

async function executeInExtension(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  if (!extensionSocket || extensionSocket.readyState !== WebSocket.OPEN) {
    throw new Error('Extension is not connected to the proxy');
  }

  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    extensionSocket!.send(JSON.stringify({
      type: 'request',
      id,
      tool: toolName,
      args
    }));

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.get(id)?.reject(new Error('Request to extension timed out'));
        pendingRequests.delete(id);
      }
    }, 10000);
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
    url: z.string().url().describe('The URL of the bookmark.'),
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
  'Delete a bookmark by its ID.',
  {
    id: z.string().describe('The ID of the bookmark to delete.'),
  },
  async (args) => {
    const result = await executeInExtension('delete_bookmark', args);
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
    url: z.string().url().optional().describe('New URL.'),
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
});

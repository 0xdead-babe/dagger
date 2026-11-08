# Dagger - Advanced Bookmark & Resource Manager

Dagger is a modern, high-performance bookmark and resource manager built as a Browser Extension. It utilizes a true dark glassmorphism aesthetic and is engineered with cutting-edge web technologies including React 19, Vite, and Dexie.js for lightning-fast IndexedDB storage. 

It uniquely features a robust background-synced architecture and native **Model Context Protocol (MCP)** integration, allowing AI assistants to query and manage your bookmarks securely through a local proxy.

## 🚀 Key Features

- **Full-Page Dashboard**: A spacious and powerful view to manage bookmarks, tags, and settings.
- **True Dark Glassmorphism UI**: A visually stunning aesthetic with beautiful gradients, custom scrollbars, and modern typography.
- **Fast Full-Text Search**: Instantly find what you need using robust client-side web worker search with full substring matching.
- **Command Palette**: Quick-open spotlight search (`Ctrl/Cmd+Shift+K`) for lightning-fast navigation.
- **Analytics Dashboard**: Comprehensive visual overview with activity timelines, top domains, and tag distributions.
- **Reading Queue**: Manage your reading list with unread badges, pinning capabilities, and advanced sorting/filtering.
- **Tag Management**: Color-coded tagging system with bulk filtering capabilities.
- **Smart Validation**: Auto title fetching via background service workers and intelligent duplicate URL detection.
- **Import / Export**: Easily backup and transfer your bookmarks via JSON.
- **Recovery Center**: Restore deleted bookmarks and tags, inspect data health, and export a backup from Settings.
- **Backup Reminder**: A dismissible in-app reminder appears when saved bookmarks have not had a backup export requested in 30 days; dismissing it snoozes it for 7 days.
- **Global Keyboard Shortcuts**:
  - `Alt/Opt + Shift + D`: Open Extension Dashboard (from browser)
  - `Alt + Shift + S`: Quick Save Current Page (from browser)
  - `Alt + Shift + A`: Save All Open Tabs (from browser)
  - `Cmd/Ctrl + Shift + K`: Open Command Palette / Quick Open (in app)
  - `/`: Focus Search (in app)
  - `Esc`: Close Modals / Clear Search (in app)
  - `?`: Open Shortcuts Help Menu (in app)
- **MCP Integration**: Expose your bookmarks to Claude or Cursor via a secure WebSocket proxy with full CRUD capabilities.

---

## Recovery and data health

Open **Settings → Recovery center** to restore items from Trash, run a local data health scan, or request a JSON backup download. Deleting a bookmark or tag moves it to Trash. Restoring a tag also restores its links to bookmarks. Trash is kept until you explicitly delete its items or empty it.

The health scan checks duplicate and unsafe URLs, duplicate tag names, and tag references that cannot be restored from Trash. It makes no network requests. You can review problem bookmarks before editing or moving them to Trash; removing orphan tag references requires confirmation.

The backup reminder tracks when an export was **requested**, not whether the browser saved the file. Check your Downloads folder and keep copies outside the browser profile. JSON exports contain current bookmarks and tags; they do not include Trash. Use **Import from File** in Settings to merge a saved backup back into the library.

---

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite (Multi-entry config for frontend & background workers)
- **Styling**: Tailwind CSS v4 (Glassmorphism + Animations)
- **Database**: Dexie.js (IndexedDB wrapper)
- **Icons**: Lucide React
- **Validation**: Zod + React Hook Form
- **MCP Protocol**: `@modelcontextprotocol/sdk`

---

## 📦 How to Build & Install

### 1. Prerequisites
- Node.js (v18+ recommended)
- NPM or PNPM

### 2. Development Mode
To run the app as a standard web application for UI development:
```bash
npm install
npm run dev
```
*(Note: Some extension-specific features like automatic title fetching will use a fallback fetch that might encounter CORS errors in dev mode. For full functionality, load it as an unpacked extension.)*

### 3. Build the Extension
To generate the production-ready extension bundle:
```bash
npm run build
```
This will compile the React app and background scripts into the `dist` directory.

### 4. Install as a Browser Extension
1. Open Google Chrome (or any Chromium-based browser like Brave or Edge).
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked**.
5. Select the `dist` folder generated from the build step.
6. **Done!** You can now use the global shortcuts or pin the extension for easy access.

---

## 🤖 MCP Configuration (AI Assistant Integration)

Dagger comes with a built-in **Model Context Protocol (MCP)** Server that acts as a secure bridge between your local IndexedDB bookmarks and AI desktop apps (like Claude Desktop or Cursor).

### Start the MCP Proxy
Copy the pairing token from **Settings → MCP Integration**. In the root directory of the project, run:
```bash
DAGGER_TOKEN="paste-pairing-token-here" npm run mcp
```
The token is required. The proxy listens only on `127.0.0.1:3004`. Connect the extension to `ws://127.0.0.1:3004` in MCP Integration while the proxy is running. Keep the proxy process running while using MCP tools.

### Configure Claude Desktop
Edit your `claude_desktop_config.json` to include the Dagger MCP server:

```json
{
  "mcpServers": {
    "dagger-bookmarks": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/your/dagger/project",
      "env": { "DAGGER_TOKEN": "paste-pairing-token-here" }
    }
  }
}
```

Replace the project path and token with your own values. Regenerating the token requires updating this configuration and restarting the proxy.

Once configured, Claude can use tools like `search_bookmarks`, `list_bookmarks`, `add_bookmark`, `list_tags`, `list_trash`, and `restore_trash_item` to help manage your resources. `delete_bookmark` moves an item to Trash.

---

## 🔒 Privacy & Security

Dagger stores bookmarks and tags in the browser's IndexedDB and waits for writes to commit before reporting success. It requests persistent storage where the browser supports it, but deleting or corrupting the browser profile can still remove local data. Export JSON backups regularly. The MCP proxy is local to your computer and requires the pairing token; title fetching contacts URLs you explicitly add.

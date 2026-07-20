# Dagger - Advanced Bookmark & Resource Manager

Dagger is a modern, high-performance bookmark and resource manager built as a Browser Extension. It utilizes a true dark glassmorphism aesthetic and is engineered with cutting-edge web technologies including React 19, Vite, and Dexie.js for lightning-fast IndexedDB storage. 

It uniquely features a robust background-synced architecture and native **Model Context Protocol (MCP)** integration, allowing AI assistants to query and manage your bookmarks securely through a local proxy.

## 🚀 Key Features

- **Full-Page Dashboard**: A spacious and powerful view to manage bookmarks, tags, and settings.
- **True Dark Glassmorphism UI**: A visually stunning aesthetic with beautiful gradients, custom scrollbars, and modern typography.
- **Fast Full-Text Search**: Instantly find what you need using robust client-side web worker search with full substring matching.
- **Command Palette**: Quick-open spotlight search (`Ctrl/Cmd+Shift+K`) for lightning-fast navigation.
- **Reading Queue**: Manage your reading list with unread badges, pinning capabilities, and advanced sorting/filtering.
- **Tag Management**: Color-coded tagging system with bulk filtering capabilities.
- **Smart Validation**: Auto title fetching via background service workers and intelligent duplicate URL detection.
- **Import / Export**: Easily backup and transfer your bookmarks via JSON.
- **Global Keyboard Shortcuts**:
  - `Cmd/Ctrl + Shift + B`: Open Extension Dashboard (from browser)
  - `Alt + Shift + S`: Quick Save Current Page (from browser)
  - `Cmd/Ctrl + Shift + K`: Open Command Palette / Quick Open (in app)
  - `/`: Focus Search (in app)
  - `Esc`: Close Modals / Clear Search (in app)
  - `?`: Open Shortcuts Help Menu (in app)
- **MCP Integration**: Expose your bookmarks to Claude or Cursor via a secure WebSocket proxy with full CRUD capabilities.

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
In the root directory of the project, run:
```bash
npm run mcp
```
This will start a local WebSocket bridge on port `3004` and expose the MCP Stdio server to your AI client.

### Configure Claude Desktop
Edit your `claude_desktop_config.json` to include the Dagger MCP server:

```json
{
  "mcpServers": {
    "dagger-bookmarks": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/your/dagger/project"
    }
  }
}
```

*Ensure you replace `/path/to/your/dagger/project` with the absolute path to this repository.*

Once configured, Claude can use tools like `search_bookmarks`, `list_bookmarks`, `add_bookmark`, and `list_tags` to help you manage your resources using natural language!

---

## 🔒 Privacy & Security

Dagger is fully local-first. All data, tags, and configurations are stored securely inside your browser's IndexedDB. No remote servers are contacted (except for fetching titles of URLs you explicitly add). Your bookmarks remain 100% private.

# Dagger – Advanced Bookmark & Resource Manager (Browser Extension)

Dagger is a modern, high-performance browser extension designed to go far beyond the native bookmark manager.  
It treats **every URL as a resource**, providing powerful tagging, filtering, persistence, and a clean UX that makes organizing knowledge effortless.

This extension is built for developers, researchers, and heavy web users who need a more structured, query-driven, and visually organized way to manage saved resources.

---

## 🚀 Features

### 🔖 Tag System
- Create unique tags (e.g., `backend`, `deployment`, `security`)
- Each tag receives a **unique color**
- Built-in default tag: **`resource`**
- Tag listing page showing:
  - Total resources per tag
  - Total read count per tag (planned)

---

### 📚 Resource / Bookmark Management
- Auto-detect page title (fallback: manual input)
- Store:
  - Title  
  - URL  
  - Description  
  - “Read” status  
  - Creation metadata (date added, etc.)

Resources persist entirely in **IndexedDB**, enabling fast lookups and offline support.

---

### 🔍 Powerful Filtering & Search
- Filter by:
  - Tags  
  - Title  
  - Description (full-text search)
  - Date range  
  - Read / unread status  
- Optimized search powered by **Web Workers** to avoid blocking UI.

---

### 💾 Import / Export
- Export all bookmarks in the extension’s native format  
- Import bookmarks from:
  - Browser (planned)
  - Extension-compatible JSON

---

### 🖥 Modern UI/UX
- Opening the extension launches a **full-page dashboard**
- Clean menus, tag views, resource grid, and forms
- Smooth, minimalistic card layout (under redesign)
- Fast interactions with careful modular architecture

---

### ⚙️ Technical Architecture
- **IndexedDB** for persistence  
- **Web Workers** for background querying  
- **Modular codebase** for future extension  
- Build scripts included to compile the extension for Chrome/Firefox-based browsers  

---

## 📝 TODO List

### Core Features
- [ ] Sync feature (cloud or browser sync)
- [ ] Key bindings / shortcuts

### UX / Forms
- [ ] Improve form input reliability  
- [ ] Fix link preview  
- [ ] Redesign card component for minimal aesthetic & click-through navigation  
- [ ] Add tag-based filtering in UI  
- [ ] “Under each tag: show total read of X”  
- [ ] Ensure tag colors are randomly assigned  
- [ ] Ensure form tabs behave correctly  
- [ ] Update extension icons  

### Completed (Based on Current Spec)
- [x] Tag system with unique colors  
- [x] Default built-in tag `resource`  
- [x] Bookmark storage: title, url, description, read state  
- [x] Auto-detect page title  
- [x] IndexedDB persistence  
- [x] Filtering by tags, text, read/unread, date range  
- [x] Web Workers for fast search/filtering  
- [x] Export/import system (initial version)  
- [x] Build/compile scripts for extension  
- [x] Modern UI with dedicated full-page display  

---

## 📦 Build & Development

This project includes build scripts to package the extension.  
Run:

```bash
npm install
npm run build


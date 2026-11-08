import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TagsProvider } from "@/contexts/TagsContext";
import { BookmarksProvider } from "@/contexts/BookmarksContext";

if (typeof navigator !== "undefined" && navigator.storage?.persist) {
  void navigator.storage.persist().catch(() => false);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BookmarksProvider>
      <TagsProvider>
        <App />
      </TagsProvider>
    </BookmarksProvider>
  </StrictMode>,
)

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, Download, RotateCcw, SearchCheck, Trash2 } from "lucide-react";
import { db } from "../db/client";
import { deleteBookmark } from "../db/bookmarks";
import { emptyTrash, permanentlyDeleteTrashEntry, restoreTrashEntry } from "../db/trash";
import type { Bookmark, TrashEntry } from "../types/entities";
import BookmarkForm from "../components/BookmarkForm";
import Modal from "../components/Modal";
import { downloadBackup } from "./backup";
import { repairOrphanTagReferences, runHealthScan, type HealthReport } from "./health";
import { useBackupReminder } from "./useBackupReminder";

function entryLabel(entry: TrashEntry): string {
  return entry.kind === "bookmark" ? entry.bookmark.title || entry.bookmark.url : entry.tag.name;
}

export function RecoveryCenter() {
  const trash = useLiveQuery(() => db.trash.orderBy("deletedAt").reverse().toArray(), []);
  const reminder = useBackupReminder();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [editing, setEditing] = useState<Bookmark | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [trashVisibleCount, setTrashVisibleCount] = useState(20);
  const [issueVisibleCount, setIssueVisibleCount] = useState(10);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const act = async (operation: () => Promise<void>, success: string, rescan = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      if (rescan && report) setReport(await runHealthScan());
      setMessage(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action failed. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const scan = () => act(async () => { setReport(await runHealthScan()); setIssueVisibleCount(10); }, "Scan complete.");
  const restore = (entry: TrashEntry) => act(() => restoreTrashEntry(entry.id), `${entry.kind === "tag" ? "Tag" : "Bookmark"} restored.`, true);
  const removeForever = (entry: TrashEntry) => {
    if (!window.confirm(`Permanently delete “${entryLabel(entry)}”? This cannot be undone.`)) return;
    void act(() => permanentlyDeleteTrashEntry(entry.id), "Item permanently deleted.", true);
  };
  const clearTrash = () => {
    if (!window.confirm(`Permanently delete all ${trash?.length ?? 0} items in Trash? This cannot be undone.`)) return;
    void act(emptyTrash, "Trash emptied.", true);
  };
  const moveProblemBookmark = (bookmark: Bookmark) => {
    if (!window.confirm(`Move “${bookmark.title || bookmark.url || bookmark.id}” to Trash?`)) return;
    void act(() => deleteBookmark(bookmark.id), "Bookmark moved to Trash.", true);
  };
  const repairOrphans = () => {
    if (!window.confirm("Remove tag references that cannot be restored from Trash?")) return;
    void act(async () => { await repairOrphanTagReferences(); }, "Orphan tag references removed.", true);
  };

  return (
    <section className="mb-10 space-y-4" aria-labelledby="recovery-heading">
      <div>
        <h2 id="recovery-heading" className="text-[18px] font-semibold text-text-primary">Recovery center</h2>
        <p className="mt-1 text-[12px] text-text-secondary">Restore deleted items, check local data, and keep an external backup.</p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-semibold text-text-primary">Backup</h3>
            <p className="mt-1 text-[11.5px] text-text-secondary">{reminder.lastExportRequestedAt === null ? "No export requested yet." : `Last export requested ${new Date(reminder.lastExportRequestedAt).toLocaleString()}.`} Downloads include current bookmarks and tags; check that your file was saved.</p>
          </div>
          <button type="button" disabled={busy} onClick={() => void act(downloadBackup, "Backup download requested. Check your Downloads folder.")} className="add-btn shrink-0 !text-[11px] !px-2.5 !py-1.5"><Download size={13} /> Export</button>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-semibold text-text-primary">Trash <span className="text-text-secondary font-normal">({trash?.length ?? 0})</span></h3>
            <p className="mt-1 text-[11.5px] text-text-secondary">Deleted items stay here until you permanently remove them. Trash is local and is not part of backup exports.</p>
          </div>
          {(trash?.length ?? 0) > 0 && <button type="button" disabled={busy} onClick={clearTrash} className="text-[11px] text-red-400 hover:text-red-300">Empty Trash</button>}
        </div>
        {trash === undefined ? <p className="text-[11.5px] text-text-secondary">Loading Trash…</p> : trash.length === 0 ? <p className="text-[11.5px] text-text-secondary">Trash is empty.</p> : (
          <div className="space-y-1">
            {trash.slice(0, trashVisibleCount).map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 border-t border-border pt-2 text-[11.5px]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-text-primary">{entry.kind === "tag" ? "Tag: " : ""}{entryLabel(entry)}</span>
                  {entry.kind === "bookmark" && <span className="block truncate text-text-secondary" title={entry.bookmark.url}>{entry.bookmark.url}</span>}
                </span>
                <span className="hidden sm:inline text-text-secondary">{new Date(entry.deletedAt).toLocaleDateString()}</span>
                <button type="button" disabled={busy} onClick={() => void restore(entry)} className="flex items-center gap-1 text-accent-text hover:text-text-primary"><RotateCcw size={12} /> Restore</button>
                <button type="button" disabled={busy} onClick={() => removeForever(entry)} className="flex items-center gap-1 text-red-400 hover:text-red-300"><Trash2 size={12} /> Delete</button>
              </div>
            ))}
            {trash.length > trashVisibleCount && <button type="button" onClick={() => setTrashVisibleCount((count) => count + 20)} className="text-[11px] text-accent-text">Show more ({trash.length - trashVisibleCount} remaining)</button>}
          </div>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-semibold text-text-primary">Data health</h3>
            <p className="mt-1 text-[11.5px] text-text-secondary">Scan local records for duplicate URLs, unsafe URLs, and broken tag references. No sites are contacted.</p>
          </div>
          <button type="button" disabled={busy} onClick={() => void scan()} className="add-btn shrink-0 !text-[11px] !px-2.5 !py-1.5"><SearchCheck size={13} /> Scan</button>
        </div>
        {report && (
          <div className="space-y-3 text-[11.5px] text-text-secondary">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <span>Duplicate URL groups: <strong className="text-text-primary">{report.duplicateBookmarks.length}</strong></span>
              <span>Unsafe URLs: <strong className="text-text-primary">{report.unsafeBookmarks.length}</strong></span>
              <span>Orphan tag links: <strong className="text-text-primary">{report.orphanTagReferences.length}</strong></span>
              <span>Duplicate tag names: <strong className="text-text-primary">{report.duplicateTags.length}</strong></span>
              <span>Malformed bookmarks: <strong className="text-text-primary">{report.malformedBookmarks.length}</strong></span>
              <span>Malformed tags: <strong className="text-text-primary">{report.malformedTags.length}</strong></span>
            </div>
            {report.duplicateBookmarks.length === 0 && report.unsafeBookmarks.length === 0 && report.orphanTagReferences.length === 0 && report.duplicateTags.length === 0 && report.malformedBookmarks.length === 0 && report.malformedTags.length === 0 && <p className="text-green-400">No issues found.</p>}
            {report.duplicateBookmarks.slice(0, issueVisibleCount).map((group) => (
              <div key={group[0].id} className="border-t border-border pt-2">
                <div className="font-medium text-text-primary truncate">{group[0].url} · {group.length} copies</div>
                {group.map((bookmark) => <div key={bookmark.id} className="flex items-center gap-2 py-1"><span className="min-w-0 flex-1 truncate">{bookmark.title}</span><button type="button" onClick={() => setEditing(bookmark)} className="text-accent-text">Edit</button><button type="button" onClick={() => moveProblemBookmark(bookmark)} className="text-red-400">Move to Trash</button></div>)}
              </div>
            ))}
            {report.unsafeBookmarks.slice(0, issueVisibleCount).map((bookmark) => <div key={bookmark.id} className="flex items-center gap-2 border-t border-border pt-2"><AlertTriangle size={13} className="text-red-400" /><span className="min-w-0 flex-1 truncate">Unsafe URL: {bookmark.title || bookmark.url}</span><button type="button" onClick={() => setEditing(bookmark)} className="text-accent-text">Edit</button><button type="button" onClick={() => moveProblemBookmark(bookmark)} className="text-red-400">Move to Trash</button></div>)}
            {report.malformedBookmarks.slice(0, issueVisibleCount).map((bookmark) => <div key={`malformed-${bookmark.id}`} className="flex items-center gap-2 border-t border-border pt-2"><AlertTriangle size={13} className="text-red-400" /><span className="min-w-0 flex-1 truncate">Malformed bookmark: {bookmark.title || bookmark.url || bookmark.id}</span><button type="button" onClick={() => setEditing(bookmark)} className="text-accent-text">Edit</button><button type="button" onClick={() => moveProblemBookmark(bookmark)} className="text-red-400">Move to Trash</button></div>)}
            {report.orphanTagReferences.length > 0 && <div className="border-t border-border pt-2"><p>{report.orphanTagReferences.length} bookmarks reference tags that do not exist in the library or Trash.</p><button type="button" disabled={busy} onClick={repairOrphans} className="mt-1 text-accent-text">Remove orphan links</button></div>}
            {report.duplicateTags.length > 0 && <p className="border-t border-border pt-2">Duplicate tag names need manual review in the Tags view.</p>}
            {(report.malformedBookmarks.length > 0 || report.malformedTags.length > 0) && <p className="border-t border-border pt-2">Malformed records need manual review. Export a copy before changing them; the JSON may need repair before it can be imported.</p>}
            {(report.duplicateBookmarks.length > issueVisibleCount || report.unsafeBookmarks.length > issueVisibleCount || report.malformedBookmarks.length > issueVisibleCount) && <button type="button" onClick={() => setIssueVisibleCount((count) => count + 10)} className="text-accent-text">Show more issues</button>}
          </div>
        )}
      </div>
      {(error || message) && <div role="status" className={`text-[11.5px] ${error ? "text-red-400" : "text-green-400"}`}>{error || message}</div>}
      <Modal isOpen={editing !== null} onClose={() => setEditing(null)} title="Edit bookmark">
        {editing && <BookmarkForm key={editing.id} initialResource={editing} onCancel={() => setEditing(null)} onSave={() => { setEditing(null); void act(async () => setReport(await runHealthScan()), "Bookmark updated."); }} />}
      </Modal>
    </section>
  );
}

import { useState } from "react";
import { Download, ShieldCheck, X } from "lucide-react";
import { useBookmarks } from "../hooks/useBookmarks";
import { downloadBackup } from "./backup";
import { shouldShowBackupNudge, snoozeBackupReminder } from "./reminders";
import { useBackupReminder } from "./useBackupReminder";

export function BackupNudge({ onOpenRecovery }: { onOpenRecovery: () => void }) {
  const { bookmarks, isLoading } = useBookmarks();
  const reminder = useBackupReminder();
  const [error, setError] = useState("");
  if (isLoading || !shouldShowBackupNudge(reminder, bookmarks.length)) return null;

  const handleExport = async () => {
    try {
      setError("");
      await downloadBackup();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the backup download.");
    }
  };

  return (
    <div className="mx-3.5 mb-3 rounded-lg border border-accent/40 bg-accent-subtle/50 px-3 py-2.5 text-[12px] text-text-primary" role="status">
      <div className="flex items-start gap-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent-text" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">Keep a copy of your bookmarks</div>
          <p className="mt-0.5 text-text-secondary">No backup export has been requested recently. Downloads cover current bookmarks and tags.</p>
          {error && <p className="mt-1 text-red-400">{error}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={handleExport} className="add-btn !px-2.5 !py-1 !text-[11px]"><Download size={12} /> Export backup</button>
            <button type="button" onClick={onOpenRecovery} className="rounded px-2 py-1 text-text-secondary hover:text-text-primary">Recovery center</button>
          </div>
        </div>
        <button type="button" onClick={() => snoozeBackupReminder()} title="Remind me in 7 days" aria-label="Remind me in 7 days" className="rounded p-1 text-text-secondary hover:text-text-primary"><X size={14} /></button>
      </div>
    </div>
  );
}

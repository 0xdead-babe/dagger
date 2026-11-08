import { useEffect, useState } from "react";
import { BACKUP_REMINDER_EVENT, readBackupReminder } from "./reminders";

export function useBackupReminder() {
  const [state, setState] = useState(readBackupReminder);
  useEffect(() => {
    const refresh = () => setState(readBackupReminder());
    window.addEventListener(BACKUP_REMINDER_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(BACKUP_REMINDER_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return state;
}

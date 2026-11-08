import React, { useRef, useState, useEffect } from "react";
import { importBackup, importBrowserBookmarks } from "./importExportData";
import { downloadBackup } from "@/recovery/backup";
import { RecoveryCenter } from "@/recovery/RecoveryCenter";
import { Download, Upload, AlertCircle, CheckCircle, Compass, Copy, Check } from "lucide-react";

function getOrCreateMcpToken(): string {
  try {
    let token = localStorage.getItem("mcp-token");
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem("mcp-token", token);
    }
    return token;
  } catch {
    return "";
  }
}

function readMcpHistory(): string[] {
  try {
    const history: unknown = JSON.parse(localStorage.getItem("mcp-history") || "[]");
    return Array.isArray(history) ? history.filter((url): url is string => typeof url === "string") : [];
  } catch {
    return [];
  }
}

function ImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInProgress = useRef(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ message: "", type: "" });
  const [mcpUrl, setMcpUrl] = useState("ws://127.0.0.1:3004");
  const [mcpStatus, setMcpStatus] = useState("disconnected");
  const [mcpError, setMcpError] = useState("");
  const [mcpHistory, setMcpHistory] = useState(readMcpHistory);
  const [mcpToken, setMcpToken] = useState(getOrCreateMcpToken);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: "MCP_STATUS" }, (res) => {
        if (res) {
          setMcpStatus(res.state);
          setMcpError(res.error);
          if (res.url) setMcpUrl(res.url);
        }
      });

      const listener = (msg: { type?: string; payload?: { state: string; error?: string; url?: string } }) => {
        if (msg?.type === "MCP_STATE_CHANGED" && msg.payload) {
          setMcpStatus(msg.payload.state);
          setMcpError(msg.payload.error || "");
          if (msg.payload.url) setMcpUrl(msg.payload.url);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  const handleConnect = () => {
    if (!mcpUrl) return;
    if (!mcpToken) {
      setMcpError("Pairing token is unavailable. Check browser storage permissions.");
      return;
    }
    if (typeof chrome === "undefined" || !chrome.runtime?.id) {
      setMcpError("Not running in extension context.");
      return;
    }
    const newHistory = [mcpUrl, ...mcpHistory.filter(url => url !== mcpUrl)].slice(0, 5);
    setMcpHistory(newHistory);
    try { localStorage.setItem('mcp-history', JSON.stringify(newHistory)); } catch { /* ignore */ }
    chrome.runtime.sendMessage({ type: "MCP_CONNECT", payload: { url: mcpUrl, token: mcpToken } });
  };

  const handleDisconnect = () => {
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      chrome.runtime.sendMessage({ type: "MCP_DISCONNECT" });
    }
  };

  const handleRegenerateToken = () => {
    try {
      const newToken = crypto.randomUUID();
      localStorage.setItem('mcp-token', newToken);
      setMcpToken(newToken);
      setMcpError("");
      if (mcpStatus === 'connected') handleDisconnect();
    } catch {
      setMcpError("Could not save a new pairing token.");
    }
  };

  const handleCopyToken = async () => {
    if (mcpToken) {
      try {
        await navigator.clipboard.writeText(mcpToken);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setMcpError("Could not copy the pairing token.");
      }
    }
  };

  const handleBrowserImport = async () => {
    if (importInProgress.current) return;
    if (typeof chrome === "undefined" || !chrome.bookmarks) {
      setImportStatus({ message: "Browser bookmarks API not available (requires extension context).", type: "error" });
      return;
    }

    importInProgress.current = true;
    setIsImporting(true);
    setImportStatus({ message: "Importing browser bookmarks...", type: "info" });

    try {
      const tree = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve, reject) => {
        chrome.bookmarks.getTree((nodes) => {
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(nodes);
        });
      });
      const { bookmarksAdded, tagsAdded, duplicatesSkipped, unsupportedSkipped } = await importBrowserBookmarks(tree);

      setImportStatus({
        message: `Browser import complete. Added ${bookmarksAdded} bookmarks and ${tagsAdded} tags. ${duplicatesSkipped} duplicates and ${unsupportedSkipped} unsupported URLs skipped.`,
        type: "success"
      });
    } catch (error) {
      setImportStatus({
        message: `Browser import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error"
      });
    } finally {
      importInProgress.current = false;
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      await downloadBackup();
      setImportStatus({ message: "Backup download requested. Check your Downloads folder.", type: "success" });
    } catch (error) {
      setImportStatus({
        message: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    }
  };

  const handleImportFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (importInProgress.current) return;

    importInProgress.current = true;
    setIsImporting(true);
    setImportStatus({ message: "Importing...", type: "info" });
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error("Backup file exceeds the 50 MB limit.");
      const { bookmarksAdded, tagsAdded, duplicatesSkipped, unsupportedSkipped } = await importBackup(await file.text());
      setImportStatus({
        message: `Import complete. Added ${bookmarksAdded} bookmarks and ${tagsAdded} tags. ${duplicatesSkipped} duplicates and ${unsupportedSkipped} unsupported URLs skipped.`,
        type: "success",
      });
    } catch (error) {
      setImportStatus({
        message: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      event.target.value = "";
      importInProgress.current = false;
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col max-w-4xl px-2 py-4 pb-12 w-full mx-auto">

      <RecoveryCenter />

      {/* Data Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#6E6455]">Data</span>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Browser Import Card */}
          <div className="flex-1 bg-[#1D1912] border border-[#2A241C] rounded-[10px] p-5 flex flex-col">
            <div className="text-[13.5px] font-semibold text-text-primary mb-2">Browser Import</div>
            <div className="text-[12px] text-[#9C9184] leading-relaxed mb-4 flex-1">
              Seamlessly import your existing browser bookmarks into Dagger. Your browser folders will automatically be converted into Dagger tags.
            </div>
            <button
              onClick={handleBrowserImport}
              disabled={isImporting}
              className="bg-[#201B14] border border-[#322B22] text-[#EFE7DA] rounded-[7px] px-3 py-2 text-[12px] font-medium inline-flex items-center gap-2 w-fit hover:border-accent/50 transition-colors"
            >
              <Compass size={14} className="text-accent" />
              Import from Browser
            </button>
          </div>

          {/* Export Data Card */}
          <div className="flex-1 bg-[#1D1912] border border-[#2A241C] rounded-[10px] p-5 flex flex-col">
            <div className="text-[13.5px] font-semibold text-text-primary mb-2">Export Data</div>
            <div className="text-[12px] text-[#9C9184] leading-relaxed mb-4 flex-1">
              Download all your bookmarks and tags as a single JSON file. Keep it as a backup or transfer to another device.
            </div>
            <button
              onClick={handleExport}
              className="bg-[#201B14] border border-[#322B22] text-[#EFE7DA] rounded-[7px] px-3 py-2 text-[12px] font-medium inline-flex items-center gap-2 w-fit hover:border-accent/50 transition-colors"
            >
              <Download size={14} className="text-accent" />
              Export Data
            </button>
          </div>

          {/* Import Data Card */}
          <div className="flex-1 bg-[#1D1912] border border-[#2A241C] rounded-[10px] p-5 flex flex-col">
            <div className="text-[13.5px] font-semibold text-text-primary mb-2">Import Data</div>
            <div className="text-[12px] text-[#9C9184] leading-relaxed mb-4 flex-1">
              Import bookmarks from a previously exported JSON file. Existing tags will be matched by name.
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="bg-[#201B14] border border-[#322B22] text-[#EFE7DA] rounded-[7px] px-3 py-2 text-[12px] font-medium inline-flex items-center gap-2 w-fit hover:border-accent/50 transition-colors"
            >
              <Upload size={14} className="text-accent" />
              Import from File
            </button>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImportFileChange}
              className="hidden"
            />
          </div>
        </div>

        {importStatus.message && (
          <div className="mt-4 flex items-center gap-3 bg-[#181510] border border-[#2A241C] rounded-[9px] p-4 text-[12px] shadow-sm w-full">
            {importStatus.type === "success" && <CheckCircle className="h-5 w-5 text-green-400" />}
            {importStatus.type === "error" && <AlertCircle className="h-5 w-5 text-red-400" />}
            <span
              className={
                importStatus.type === "error"
                  ? "text-red-400 font-medium"
                  : "text-[#EFE7DA]"
              }
            >
              {importStatus.message}
            </span>
          </div>
        )}
      </div>

      {/* AI Integrations Section */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-[11px] font-semibold tracking-[0.09em] uppercase text-[#6E6455]">AI Integrations</span>
          <span className="text-[9.5px] font-bold tracking-[0.05em] uppercase text-[#F0A57C] bg-[#3A2317] px-2 py-0.5 rounded-full">Beta</span>
        </div>

        <div className="bg-[#1D1912] border border-[#2A241C] rounded-[10px] p-6">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-accent font-mono font-bold text-[15px]">&gt;_</span>
              <span className="text-[14.5px] font-semibold text-text-primary">MCP Integration</span>
            </div>
          </div>

          <div className="text-[12px] text-[#9C9184] leading-[1.6] mt-2 mb-5 max-w-2xl">
            Connect to a running Dagger MCP proxy so AI assistants like Claude Desktop or Cursor can search and manage your bookmarks using natural language.
          </div>

          <div className="bg-[#181510] border border-[#2A241C] rounded-[9px] p-4.5 px-5 py-4">
            <div className="flex items-end gap-2.5 mb-0">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold tracking-[0.07em] uppercase text-[#6E6455] mb-1.5">Proxy URL</label>
                <input
                  type="text"
                  value={mcpUrl}
                  onChange={(e) => setMcpUrl(e.target.value)}
                  disabled={mcpStatus === 'connected' || mcpStatus === 'connecting'}
                  className="w-full bg-[#201B14] border border-[#322B22] rounded-[6px] px-2.5 py-2 text-[12.5px] text-[#EFE7DA] font-mono focus:border-accent focus:outline-none disabled:opacity-50"
                  placeholder="ws://127.0.0.1:3004"
                />
              </div>

              {mcpStatus === 'connected' ? (
                <button
                  onClick={handleDisconnect}
                  className="bg-transparent border border-[#322B22] text-[#9C9184] hover:text-text-primary rounded-[6px] px-3 py-2 text-[12px] shrink-0 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={mcpStatus === 'connecting' || !mcpUrl || !mcpToken}
                  className="bg-accent text-[#FCEEE6] border-none rounded-[6px] px-3.5 py-2 text-[12.5px] font-medium shrink-0 disabled:opacity-50"
                >
                  {mcpStatus === 'connecting' ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>

            <div className="flex items-end gap-2.5 mb-[14px] mt-4">
              <div className="flex-1">
                <div className="block text-[10px] font-semibold tracking-[0.07em] uppercase text-[#6E6455] mb-1.5">Pairing Token</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#201B14] border border-[#322B22] rounded-[6px] px-2.5 py-2 text-[12.5px] text-[#9C9184] font-mono tracking-[0.05em] overflow-hidden text-ellipsis whitespace-nowrap">
                    {mcpToken ? "••••••••••••••••" + mcpToken.slice(-4) : "No token"}
                  </div>
                  <button onClick={handleCopyToken} title={copied ? "Copied!" : "Copy Token"} className="shrink-0 w-8 h-8 bg-[#201B14] border border-[#322B22] rounded-[6px] text-[#9C9184] hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer">
                    {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
              <button onClick={handleRegenerateToken} className="bg-transparent border border-[#322B22] text-[#9C9184] rounded-[6px] px-3 py-2 text-[12px] shrink-0 hover:text-text-primary transition-colors cursor-pointer">
                Regenerate
              </button>
            </div>

            <div className="text-[11px] text-[#6E6455] leading-[1.6] mb-4">
              Set <code>DAGGER_TOKEN</code> to this pairing token when starting the local MCP proxy. Regenerating the token disconnects the current session.
            </div>

            {mcpError && (
              <div className="mt-3 text-[12px] text-red-400 flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" /> {mcpError}
              </div>
            )}

            <div className="h-px bg-[#241F19] my-4"></div>

            <div className="flex items-center gap-2 text-[12px] text-[#9C9184]">
              {mcpStatus === 'connected' ? (
                <div className="w-2 h-2 rounded-full bg-[#8FA876] shadow-[0_0_0_3px_rgba(143,168,118,0.18)] shrink-0"></div>
              ) : mcpStatus === 'connecting' ? (
                <div className="w-2 h-2 rounded-full bg-[#D9A441] shadow-[0_0_0_3px_rgba(217,164,65,0.18)] shrink-0 animate-pulse"></div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#544C40] shrink-0"></div>
              )}
              <span>Status: <strong className={mcpStatus === 'connected' ? 'text-[#EFE7DA]' : mcpStatus === 'connecting' ? 'text-[#D9A441]' : 'text-[#9C9184] font-normal'}>{mcpStatus === 'connected' ? 'Connected' : mcpStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}</strong></span>
            </div>
          </div>

          {mcpHistory.length > 0 && mcpStatus === 'disconnected' && (
            <div className="mt-5">
              <div className="text-[10px] font-semibold tracking-[0.07em] uppercase text-[#6E6455] mb-2.5">Previous connections</div>
              <div className="flex flex-wrap gap-2">
                {mcpHistory.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#201B14] border border-[#322B22] rounded-[7px] px-2.5 py-1.5 text-[11.5px] text-[#9C9184] font-mono group">
                    <button onClick={() => setMcpUrl(url)} className="hover:text-text-primary transition-colors text-left">{url}</button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newHist = mcpHistory.filter((_, idx) => idx !== i);
                        setMcpHistory(newHist);
                        localStorage.setItem('mcp-history', JSON.stringify(newHist));
                      }}
                      className="text-[#6E6455] hover:text-red-400 font-sans opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                      title="Remove"
                    >
                      &#10005;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportExport;

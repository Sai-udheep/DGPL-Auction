import React, { useState } from "react";
import {
  Upload,
  FileText,
  Code,
  X,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Sparkles,
  Download,
  Copy,
  Check,
  Link2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { API_URL } from "../../config";
import { useAuth } from "../../context/authContextCore";

export default function CsvUploadModal({ isOpen, onClose, token: propToken, onUploadSuccess }) {
  const { token: authContextToken } = useAuth();
  const token =
    propToken ||
    authContextToken ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("auth_token") : null);

  const [activeTab, setActiveTab] = useState("google_form"); // "google_form" | "file" | "paste"
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [importAsUnapproved, setImportAsUnapproved] = useState(true);
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [previewData, setPreviewData] = useState([]);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sampleCsv = `name,category,year,basePrice,image
Rohit Sharma,Batsman,4,2.0,https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80
Virat Kohli,Batsman,4,2.0,https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80
Jasprit Bumrah,Bowler,3,1.5,https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80
Hardik Pandya,All-Rounder,3,1.5,https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80
Rishabh Pant,Wicket-Keeper,2,1.0,https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80`;

  const getAutoBasePrice = (year) => {
    const y = parseInt(year, 10);
    if (y === 1) return 0.5;
    if (y === 2) return 1.0;
    if (y === 3) return 1.5;
    if (y === 4) return 2.0;
    return 0.5;
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(sampleCsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "dgpl_players_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizeCategory = (cat) => {
    if (!cat) return "All-Rounder";
    const s = String(cat).trim().toLowerCase();
    if (s.includes("wk") || s.includes("keep") || s.includes("wicket")) return "Wicket-Keeper";
    if (s.includes("bat")) return "Batsman";
    if (s.includes("bowl")) return "Bowler";
    return "All-Rounder";
  };

  // Google Sheet / Google Forms Dynamic Sync Handler
  const handleSyncGoogleSheet = async () => {
    if (!googleSheetUrl || !googleSheetUrl.trim()) {
      setError("Please paste a valid Google Sheet or CSV URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/players/sync-google-sheet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sheetUrl: googleSheetUrl.trim(),
          asUnapproved: importAsUnapproved,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to sync from Google Sheet.");
      }

      setSuccessMsg(data.message || `Successfully synced ${data.count || 0} players!`);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setError(err.message || "Error occurred while syncing from Google Sheet.");
    } finally {
      setLoading(false);
    }
  };

  const parseInput = (rawText) => {
    setError(null);
    setSuccessMsg(null);
    const trimmed = rawText.trim();
    if (!trimmed) {
      setPreviewData([]);
      return;
    }

    // 1. JSON Array format
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const json = JSON.parse(trimmed);
        if (!Array.isArray(json)) throw new Error("JSON must be an array of player objects");
        const list = json
          .map((p) => {
            const year = parseInt(p.year, 10) || 1;
            const basePrice =
              p.basePrice != null && p.basePrice !== ""
                ? parseFloat(p.basePrice)
                : getAutoBasePrice(year);
            return {
              name: p.name || "",
              category: normalizeCategory(p.category || p.role),
              year,
              basePrice,
              image: p.image || p.photo || p.imageUrl || "",
            };
          })
          .filter((p) => p.name.trim().length > 0);
        setPreviewData(list);
      } catch (err) {
        setError("Invalid JSON format: " + err.message);
        setPreviewData([]);
      }
      return;
    }

    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      setPreviewData([]);
      return;
    }

    // 2. Vertical Google Forms copy-paste detection (1 field per line)
    let isVerticalHeaders = false;
    let numVerticalHeaders = 0;
    for (let i = 0; i < Math.min(15, lines.length); i++) {
      const l = lines[i];
      if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l) || (l.includes("@") && !l.toLowerCase().includes("address"))) {
        numVerticalHeaders = i;
        isVerticalHeaders = true;
        break;
      }
    }

    if (isVerticalHeaders && numVerticalHeaders >= 3) {
      const headerNames = lines.slice(0, numVerticalHeaders).map((h) => h.toLowerCase());
      const dataLines = lines.slice(numVerticalHeaders);
      const parsed = [];

      for (let i = 0; i < dataLines.length; i += numVerticalHeaders) {
        const chunk = dataLines.slice(i, i + numVerticalHeaders);
        if (chunk.length < 3) continue;

        const entry = {};
        for (let j = 0; j < Math.min(headerNames.length, chunk.length); j++) {
          entry[headerNames[j]] = chunk[j];
        }

        const nameKey = Object.keys(entry).find(
          (k) => (k.includes("name") || k.includes("player")) && !k.includes("timestamp")
        );
        const name = nameKey ? entry[nameKey].trim() : "";
        if (!name) continue;

        const roleKey = Object.keys(entry).find((k) =>
          k.includes("role") || k.includes("category") || k.includes("skill") || k.includes("playing")
        );
        const category = normalizeCategory(roleKey ? entry[roleKey] : "All-Rounder");

        const yearKey = Object.keys(entry).find((k) =>
          k.includes("year") || k.includes("academic") || k.includes("batch") || k.includes("participation")
        );
        let year = 1;
        if (yearKey && entry[yearKey]) {
          const yMatch = entry[yearKey].match(/\d+/);
          if (yMatch) year = parseInt(yMatch[0], 10);
        }
        const basePrice = getAutoBasePrice(year);

        const photoKey = Object.keys(entry).find((k) =>
          k.includes("photo") || k.includes("image") || k.includes("picture") || k.includes("upload") || k.includes("link") || k.includes("url")
        );
        let image = photoKey ? entry[photoKey] : "";
        const urlMatch = image.match(/https?:\/\/[^\s\)\]]+/);
        if (urlMatch) image = urlMatch[0];
        const driveMatch = image.match(/\/d\/([a-zA-Z0-9_-]+)/) || image.match(/id=([a-zA-Z0-9_-]+)/);
        if (driveMatch) {
          image = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        }
        if (!image) {
          image = `https://via.placeholder.com/200x250?text=${encodeURIComponent(name)}`;
        }

        parsed.push({
          name,
          category,
          year,
          basePrice,
          image,
        });
      }

      if (parsed.length > 0) {
        setPreviewData(parsed);
        return;
      }
    }

    // 3. Tab-separated values (TSV from Google Sheets copy) or Comma-separated (CSV)
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const nameIdx = headers.findIndex((h) => (h.includes("name") || h.includes("player")) && !h.includes("timestamp"));
    const catIdx = headers.findIndex((h) => h.includes("role") || h.includes("category") || h.includes("skill") || h.includes("playing"));
    const yearIdx = headers.findIndex((h) => h.includes("year") || h.includes("batch") || h.includes("academic") || h.includes("participation"));
    const priceIdx = headers.findIndex((h) => h.includes("price") || h.includes("base") || h.includes("points"));
    const imgIdx = headers.findIndex((h) => h.includes("photo") || h.includes("image") || h.includes("picture") || h.includes("link") || h.includes("url") || h.includes("upload"));

    if (nameIdx === -1) {
      // 4. Freeform fallback scan (e.g. without headers)
      const freeform = [];
      let cur = {};
      for (const l of lines) {
        if (l.includes("@")) {
          if (cur.name) freeform.push(cur);
          cur = {};
        } else if (/\b(1st|2nd|3rd|4th|\d)\s*Year\b/i.test(l)) {
          const ym = l.match(/\d+/);
          cur.year = ym ? parseInt(ym[0], 10) : 1;
        } else if (/\b(Batsman|Bowler|All.?Rounder|Wicket.?Keeper)\b/i.test(l)) {
          cur.category = normalizeCategory(l);
        } else if (/https?:\/\//i.test(l)) {
          const urlMatch = l.match(/https?:\/\/[^\s\)\]]+/);
          let img = urlMatch ? urlMatch[0] : "";
          const dm = img.match(/\/d\/([a-zA-Z0-9_-]+)/) || img.match(/id=([a-zA-Z0-9_-]+)/);
          if (dm) img = `https://lh3.googleusercontent.com/d/${dm[1]}`;
          cur.image = img;
        } else if (!cur.name && l.length > 1 && !/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l) && !l.toLowerCase().includes("pending") && !l.toLowerCase().includes("received")) {
          cur.name = l;
        }
      }
      if (cur.name) freeform.push(cur);

      if (freeform.length > 0) {
        const list = freeform.map((p) => {
          const y = p.year || 1;
          return {
            name: p.name,
            category: normalizeCategory(p.category || "All-Rounder"),
            year: y,
            basePrice: getAutoBasePrice(y),
            image: p.image || `https://via.placeholder.com/200x250?text=${encodeURIComponent(p.name)}`,
          };
        });
        setPreviewData(list);
        return;
      }

      setError('Could not identify a "Full Name" or player column. Please check your pasted text.');
      setPreviewData([]);
      return;
    }

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cells = delimiter === "\t"
        ? line.split("\t").map((c) => c.trim().replace(/^"|"$/g, ""))
        : (line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",")).map((c) => c.trim().replace(/^"|"$/g, ""));

      const name = cells[nameIdx];
      if (!name) continue;

      let category = normalizeCategory(catIdx >= 0 ? cells[catIdx] : "All-Rounder");

      let year = 1;
      if (yearIdx >= 0 && cells[yearIdx]) {
        const yMatch = cells[yearIdx].match(/\d+/);
        if (yMatch) year = parseInt(yMatch[0], 10);
      }

      let basePrice = getAutoBasePrice(year);
      if (priceIdx >= 0 && cells[priceIdx]) {
        const pVal = parseFloat(cells[priceIdx]);
        if (!isNaN(pVal)) basePrice = pVal;
      }

      let image = imgIdx >= 0 && cells[imgIdx] ? cells[imgIdx] : "";
      const urlMatch = image.match(/https?:\/\/[^\s\)\]]+/);
      if (urlMatch) image = urlMatch[0];
      const driveMatch = image.match(/\/d\/([a-zA-Z0-9_-]+)/) || image.match(/id=([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        image = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
      }
      if (!image) {
        image = `https://via.placeholder.com/200x250?text=${encodeURIComponent(name)}`;
      }

      parsed.push({
        name,
        category,
        year,
        basePrice,
        image,
      });
    }

    if (parsed.length === 0) {
      setError("No valid player rows found.");
    }
    setPreviewData(parsed);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      parseInput(text);
    };
    reader.readAsText(selected);
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setPastedText(text);
    parseInput(text);
  };

  const handleUpload = async () => {
    if (previewData.length === 0) {
      setError("No valid player rows found to upload.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const batchSize = 10;
      let createdCount = 0;
      let firstErrorMsg = null;

      for (let i = 0; i < previewData.length; i += batchSize) {
        const batch = previewData.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(async (p) => {
            const singleRes = await fetch(`${API_URL}/api/v1/players`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                name: p.name.trim(),
                category: normalizeCategory(p.category),
                year: parseInt(p.year, 10) || 1,
                basePrice: typeof p.basePrice === "number" ? p.basePrice : parseFloat(p.basePrice) || 0.5,
                image: p.image || `https://via.placeholder.com/200x250?text=${encodeURIComponent(p.name)}`,
                status: "unsold",
                isCaptain: false,
                isApproved: !importAsUnapproved,
              }),
            });
            if (!singleRes.ok) {
              const errJson = await singleRes.json().catch(() => ({}));
              throw new Error(errJson.message || `Failed to create ${p.name}`);
            }
            return singleRes;
          })
        );

        createdCount += results.filter((r) => r.status === "fulfilled").length;
        if (!firstErrorMsg) {
          const rejected = results.find((r) => r.status === "rejected");
          if (rejected) firstErrorMsg = rejected.reason?.message;
        }
      }

      if (createdCount === 0) {
        throw new Error(firstErrorMsg || "Failed to create players.");
      }

      setSuccessMsg(
        `Successfully imported ${createdCount} players ${
          importAsUnapproved ? "into Unapproved Pool for review" : "directly into the tournament pool"
        }!`
      );
      setPreviewData([]);
      setFile(null);
      setPastedText("");
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setError(err.message || "Error occurred while uploading");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0c1017] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Import Tournament Players
              </h2>
              <p className="text-xs text-white/50">
                Sync live from Google Forms or upload CSV / JSON files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition p-2 rounded-xl hover:bg-white/10 cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unapproved Pool Protection Toggle (Universal) */}
        <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-200">
                Unapproved Pool (Gatekeeper)
              </p>
              <p className="text-[11px] text-white/50">
                Hold imported players in Unapproved Queue until Admin reviews & approves them.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={importAsUnapproved}
              onChange={(e) => setImportAsUnapproved(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 px-4 sm:px-6 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab("google_form");
              setError(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "google_form"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-white/50 hover:text-white"
            }`}
            type="button"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Google Forms / Sheet</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("file");
              setError(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "file"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-white/50 hover:text-white"
            }`}
            type="button"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload File (.csv)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("paste");
              setError(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === "paste"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-white/50 hover:text-white"
            }`}
            type="button"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Paste Data</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: GOOGLE FORM / SHEET SYNC */}
          {activeTab === "google_form" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/70 space-y-2">
                <p className="font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>How to dynamically load from Google Forms:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-white/60 text-[11px] leading-relaxed">
                  <li>Open the Google Sheet linked to your Google Form registration.</li>
                  <li>Click <strong>Share</strong> (top right) and set access to <strong>"Anyone with the link can view"</strong>.</li>
                  <li>Copy the Google Sheet URL and paste it below.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Google Sheet URL or Published CSV Link
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs.../edit"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSyncGoogleSheet}
                  disabled={loading || !googleSheetUrl.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-40 cursor-pointer transition"
                  type="button"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  <span>{loading ? "Syncing..." : "⚡ Sync from Google Forms"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FILE UPLOAD */}
          {activeTab === "file" && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-white/15 hover:border-cyan-400/40 rounded-3xl p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition group">
                <Upload className="w-8 h-8 text-white/30 group-hover:text-cyan-400 transition" />
                <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                  {file ? file.name : "Select or Drop CSV / JSON File"}
                </span>
                <span className="text-[11px] text-white/40">
                  Google Form responses CSV or standard player list
                </span>
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {/* Template Buttons */}
              <div className="flex items-center justify-between text-xs text-white/50 pt-1">
                <span>Need a reference template?</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyTemplate}
                    className="hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition"
                    type="button"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy Template"}</span>
                  </button>
                  <span>•</span>
                  <button
                    onClick={handleDownloadTemplate}
                    className="hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition"
                    type="button"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE DATA */}
          {activeTab === "paste" && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-white/80">
                Paste CSV or JSON Rows
              </label>
              <textarea
                rows={6}
                value={pastedText}
                onChange={handleTextChange}
                placeholder="Paste CSV lines (e.g. Name, Category, Year) or JSON array..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-3 text-xs text-white font-mono placeholder-white/30 focus:outline-none focus:border-cyan-400/50"
              />
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span className="font-bold">Parsed Preview ({previewData.length} Players)</span>
                <span className="text-[11px] text-white/40">Auto base price applied</span>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-black/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.05] text-white/60 sticky top-0 border-b border-white/10">
                    <tr>
                      <th className="p-2.5">Player</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Year</th>
                      <th className="p-2.5">Base Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {previewData.slice(0, 15).map((p, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="p-2.5 font-medium flex items-center gap-2 truncate max-w-[150px]">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover shrink-0"
                              onError={(e) => (e.target.style.display = "none")}
                            />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                          )}
                          <span className="truncate">{p.name}</span>
                        </td>
                        <td className="p-2.5">{p.category}</td>
                        <td className="p-2.5">Year {p.year}</td>
                        <td className="p-2.5 font-bold text-amber-300">{p.basePrice} Pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length > 15 && (
                <p className="text-[10px] text-white/40 text-center">
                  + {previewData.length - 15} more rows...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab !== "google_form" && (
          <div className="p-4 sm:p-6 border-t border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white/70 hover:text-white transition cursor-pointer"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={loading || previewData.length === 0}
              className="px-6 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-lg shadow-cyan-500/20 disabled:opacity-40 cursor-pointer"
              type="button"
            >
              {loading ? "Uploading..." : `Import ${previewData.length} Players`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

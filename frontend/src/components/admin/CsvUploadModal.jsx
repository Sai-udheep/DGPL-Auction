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
} from "lucide-react";
import { API_URL } from "../../config";

export default function CsvUploadModal({ isOpen, onClose, token, onUploadSuccess }) {
  const [activeTab, setActiveTab] = useState("file"); // "file" | "paste"
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState("");
  const [previewData, setPreviewData] = useState([]);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sampleCsv = `name,year,category,image,basePrice
Rohit Sharma,4,Batsman,https://res.cloudinary.com/demo/image/upload/sample.jpg,2.0
Jasprit Bumrah,3,Bowler,,1.5
Hardik Pandya,2,All-Rounder,,1.0
Rishabh Pant,1,Wicket-Keeper,,0.5`;

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
              category: p.category || p.role || "All-Rounder",
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

    // 2. CSV format
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setError("CSV must have a header row and at least 1 player entry.");
      setPreviewData([]);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("player"));
    const catIdx = headers.findIndex((h) => h.includes("role") || h.includes("category") || h.includes("skill"));
    const yearIdx = headers.findIndex((h) => h.includes("year") || h.includes("batch") || h.includes("academic"));
    const priceIdx = headers.findIndex((h) => h.includes("price") || h.includes("base") || h.includes("points"));
    const imgIdx = headers.findIndex(
      (h) => h.includes("photo") || h.includes("image") || h.includes("picture") || h.includes("link") || h.includes("url")
    );

    if (nameIdx === -1) {
      setError('Missing "name" header column in CSV.');
      setPreviewData([]);
      return;
    }

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Handle commas inside quotes or plain split
      const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const name = cells[nameIdx];
      if (!name) continue;

      let category = catIdx >= 0 ? cells[catIdx] : "All-Rounder";
      if (!category) category = "All-Rounder";

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

      const image = imgIdx >= 0 && cells[imgIdx] ? cells[imgIdx] : "";

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
    try {
      const res = await fetch(`${API_URL}/api/v1/players/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ players: previewData }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to upload players");
      }

      setSuccessMsg(`Successfully imported ${data.count || previewData.length} players!`);
      setTimeout(() => {
        if (onUploadSuccess) onUploadSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || "Error occurred while uploading");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="glass-card max-w-2xl w-full p-5 sm:p-7 space-y-5 border-white/20 bg-[#0e121c]/95 shadow-2xl my-auto max-h-[92vh] overflow-y-auto custom-scroll relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Import Players</h3>
              <p className="text-xs text-white/50">Upload CSV or JSON player list to populate tournament pool</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CSV Format Specification Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/[0.08] to-blue-500/[0.03] border border-cyan-500/25 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                Required CSV Column Format
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTemplate}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 transition flex items-center gap-1 cursor-pointer"
                type="button"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied!" : "Copy Format"}</span>
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 transition flex items-center gap-1 cursor-pointer"
                type="button"
              >
                <Download className="w-3 h-3" />
                <span>Template .csv</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
            <div className="bg-black/30 p-2 rounded-xl border border-white/10">
              <strong className="text-cyan-300 block">name</strong>
              <span className="text-white/40 text-[10px]">Full Name *</span>
            </div>
            <div className="bg-black/30 p-2 rounded-xl border border-white/10">
              <strong className="text-cyan-300 block">year</strong>
              <span className="text-white/40 text-[10px]">1, 2, 3, or 4 *</span>
            </div>
            <div className="bg-black/30 p-2 rounded-xl border border-white/10">
              <strong className="text-cyan-300 block">category</strong>
              <span className="text-white/40 text-[10px]">Batsman / Bowler *</span>
            </div>
            <div className="bg-black/30 p-2 rounded-xl border border-white/10">
              <strong className="text-white/70 block">image</strong>
              <span className="text-white/40 text-[10px]">Photo URL (optional)</span>
            </div>
            <div className="bg-black/30 p-2 rounded-xl border border-white/10">
              <strong className="text-white/70 block">basePrice</strong>
              <span className="text-white/40 text-[10px]">Auto (optional)</span>
            </div>
          </div>

          <p className="text-[10px] text-white/50">
            * <em>basePrice</em> is automatically assigned based on year (1st=0.5, 2nd=1.0, 3rd=1.5, 4th=2.0 Pts) if left blank.
          </p>
        </div>

        {/* Input tabs */}
        <div className="flex border-b border-white/10 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("file")}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer border-b-2 transition ${
              activeTab === "file"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Upload File (.csv / .json)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer border-b-2 transition ${
              activeTab === "paste"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-white/40 hover:text-white"
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Paste CSV or JSON</span>
          </button>
        </div>

        {/* Tab content */}
        {activeTab === "file" ? (
          <div className="space-y-3">
            <label className="border-2 border-dashed border-white/15 hover:border-cyan-400/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition group">
              <Upload className="w-8 h-8 text-white/30 group-hover:text-cyan-400 transition" />
              <span className="text-xs font-semibold text-white/80">
                {file ? file.name : "Click or drag CSV or JSON file here"}
              </span>
              <span className="text-[11px] text-white/40">Supported extensions: .csv, .json</span>
              <input
                type="file"
                accept=".csv, application/json, .json, text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={6}
              value={pastedText}
              onChange={handleTextChange}
              placeholder="Paste raw CSV lines (e.g. name,year,category,image,basePrice)..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:outline-none focus:border-cyan-400 font-mono custom-scroll"
            />
          </div>
        )}

        {/* Preview Section */}
        {previewData.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Parsed {previewData.length} Players:
              </span>
              <span className="text-white/40 text-[11px]">Ready to import</span>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scroll border border-white/10 rounded-xl bg-black/30">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 bg-[#0e121c] border-b border-white/10 text-white/40 font-bold uppercase">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Year</th>
                    <th className="p-2">Base Pts</th>
                    <th className="p-2">Photo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/70">
                  {previewData.map((p, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="p-2 font-semibold text-white">{p.name}</td>
                      <td className="p-2">{p.category}</td>
                      <td className="p-2">Year {p.year}</td>
                      <td className="p-2 text-emerald-400 font-bold">{p.basePrice} Pts</td>
                      <td className="p-2">
                        {p.image ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 truncate max-w-[120px]">
                            <ImageIcon className="w-3 h-3 shrink-0" /> Link
                          </span>
                        ) : (
                          <span className="text-white/30 text-[10px]">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error / Success Feedback */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="text-[11px] text-white/40">
            {previewData.length > 0 ? `${previewData.length} players ready` : "No file parsed"}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white/60 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-xl transition cursor-pointer"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={loading || previewData.length === 0}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
                loading || previewData.length === 0
                  ? "bg-white/[0.05] text-white/30 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg shadow-cyan-500/20"
              }`}
              type="button"
            >
              {loading ? "Importing..." : `Import ${previewData.length} Players`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

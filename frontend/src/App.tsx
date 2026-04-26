import { useState, useEffect } from "react";
import { Sun, Moon, Shield } from "lucide-react";
import type { AnalysisResult, UploadResult, ColumnMapping, Filters } from "./types";
import { API_BASE } from "./api";
import UploadSection from "./components/UploadSection";
import MappingSection from "./components/MappingSection";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });
  const [uploadData, setUploadData] = useState<UploadResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    amountCol: "",
    accountCol: "",
    typeCol: "",
    merchantCol: "",
    dateCol: "",
  });
  const [filters, setFilters] = useState<Filters>({
    startDate: "",
    endDate: "",
    highAmountThreshold: 0,
    rapidTxnThreshold: 0,
    riskyMerchants: [],
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleUpload = async (file: File) => {
    setError("");
    setResult(null);
    setLoading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: form });
      const data: UploadResult = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setUploadData(data);
      }
    } catch {
      setError("Failed to upload file. Is the backend running?");
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!mapping.amountCol || !mapping.accountCol || !mapping.typeCol) {
      setError("Please map Amount, Account ID, and Type columns.");
      return;
    }
    setError("");
    setLoading(true);
    const form = new FormData();
    form.append("body", JSON.stringify({ ...mapping, ...filters }));
    try {
      const res = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Analysis failed. Check the backend.");
    }
    setLoading(false);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>
          <Shield size={28} />
          Transaction Analysis & Fraud Detection
        </h1>
        <div className="header-actions">
          {result && (
            <>
              <a href={`${API_BASE}/api/download-flagged`} className="btn btn-secondary" download>
                Export Flagged
              </a>
              <a href={`${API_BASE}/api/download-full`} className="btn btn-secondary" download>
                Export Full
              </a>
            </>
          )}
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", marginBottom: 20 }}>
          <p style={{ color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {!uploadData && !loading && <UploadSection onUpload={handleUpload} />}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>Processing...</span>
        </div>
      )}

      {uploadData && !result && !loading && (
        <MappingSection
          columns={uploadData.columns}
          preview={uploadData.preview}
          totalRows={uploadData.totalRows}
          mapping={mapping}
          onMappingChange={setMapping}
          onAnalyze={handleAnalyze}
          onReset={() => {
            setUploadData(null);
            setResult(null);
          }}
        />
      )}

      {result && (
        <Dashboard
          result={result}
          filters={filters}
          onFiltersChange={setFilters}
          onReanalyze={handleAnalyze}
          onReset={() => {
            setUploadData(null);
            setResult(null);
            setMapping({ amountCol: "", accountCol: "", typeCol: "", merchantCol: "", dateCol: "" });
          }}
        />
      )}
    </div>
  );
}

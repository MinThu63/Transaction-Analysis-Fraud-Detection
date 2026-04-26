import { useState, useEffect, useRef, useCallback } from "react";
import type { AnalysisResult, Filters } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  AlertTriangle, TrendingUp, Users, Store, Clock, RotateCcw,
  Filter, X, Activity, ShieldAlert, Info, BarChart3,
  FileText, Network, Layers, UserCheck,
} from "lucide-react";

const COLORS = ["#4f6ef7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
const CLUSTER_COLORS = ["#ef4444", "#4f6ef7", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16"];
const RISK_COLORS: Record<string, string> = {
  low: "#10b981", medium: "#f59e0b", high: "#ef4444", critical: "#dc2626",
};

interface Props {
  result: AnalysisResult;
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  onReanalyze: () => void;
  onReset: () => void;
}

export default function Dashboard({ result, filters, onFiltersChange, onReanalyze, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { summary } = result;

  const tabs = [
    { id: "overview", label: "Overview", icon: <Activity size={14} /> },
    { id: "report", label: "AI Report", icon: <FileText size={14} /> },
    { id: "fraud", label: "Fraud Detection", icon: <ShieldAlert size={14} /> },
    { id: "clusters", label: "Anomaly Clusters", icon: <Layers size={14} /> },
    { id: "accounts", label: "Account Profiles", icon: <UserCheck size={14} /> },
    { id: "network", label: "Network Graph", icon: <Network size={14} /> },
    { id: "merchants", label: "Merchants", icon: <Store size={14} /> },
    { id: "forensics", label: "Forensics", icon: <BarChart3 size={14} /> },
  ];

  const insights = generateInsights(result);

  return (
    <div>
      <div className="metrics-grid">
        <AnimatedMetric label="Total Transactions" target={summary.totalTransactions} prefix="" />
        <AnimatedMetric label="Unique Accounts" target={summary.uniqueAccounts} prefix="" />
        <AnimatedMetric label="Average Amount" target={summary.avgAmount} prefix="$" sub={`Median: $${summary.medianAmount.toLocaleString()}`} />
        <AnimatedMetric label="Max Amount" target={summary.maxAmount} prefix="$" sub={`Min: $${summary.minAmount.toLocaleString()}`} />
        <AnimatedMetric
          label="Flagged Transactions" target={summary.flaggedCount} prefix=""
          sub={`${summary.flaggedPct}% of total`}
          accent={summary.flaggedCount > 0 ? "var(--danger)" : undefined}
        />
        <AnimatedMetric label="Std Deviation" target={summary.stdAmount} prefix="$" sub={`${summary.uniqueTypes} transaction types`} />
      </div>

      {insights.length > 0 && (
        <div className="section">
          <div className="section-header"><h2><Info size={18} /> Key Insights</h2></div>
          {insights.map((ins, i) => (
            <div key={i} className={`insight-card insight-${ins.level}`}>
              {ins.level === "danger" && <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
              {ins.level === "warning" && <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
              {ins.level === "info" && <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
              {ins.level === "success" && <TrendingUp size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
              <p>{ins.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setSidebarOpen(true)}><Filter size={14} /> Filters</button>
          <button className="btn btn-secondary" onClick={onReset}><RotateCcw size={14} /> New File</button>
        </div>
      </div>

      {activeTab === "overview" && <OverviewTab result={result} />}
      {activeTab === "report" && <ReportTab result={result} />}
      {activeTab === "fraud" && <FraudTab result={result} />}
      {activeTab === "clusters" && <ClustersTab result={result} />}
      {activeTab === "accounts" && <AccountProfilesTab result={result} />}
      {activeTab === "network" && <NetworkTab result={result} />}
      {activeTab === "merchants" && <MerchantsTab result={result} />}
      {activeTab === "forensics" && <ForensicsTab result={result} />}

      <FilterSidebar
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        filters={filters} onChange={onFiltersChange}
        merchants={result.merchants} onApply={() => { setSidebarOpen(false); onReanalyze(); }}
      />
    </div>
  );
}


/* ==================== ANIMATED METRIC ==================== */
function AnimatedMetric({ label, target, prefix, sub, accent }: {
  label: string; target: number; prefix: string; sub?: string; accent?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = ref.current;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = from + (target - from) * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
      else ref.current = target;
    };
    requestAnimationFrame(animate);
  }, [target]);

  const formatted = target >= 1000 && !prefix
    ? Math.round(display).toLocaleString()
    : prefix
      ? `${prefix}${display.toLocaleString(undefined, { minimumFractionDigits: target % 1 !== 0 ? 2 : 0, maximumFractionDigits: 2 })}`
      : Math.round(display).toLocaleString();

  return (
    <div className="card metric-card">
      <div className="metric-value" style={accent ? { color: accent } : undefined}>{formatted}</div>
      <div className="metric-label">{label}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}

/* ==================== OVERVIEW TAB ==================== */
function OverviewTab({ result }: { result: AnalysisResult }) {
  return (
    <>
      <div className="charts-grid">
        <div className="card fade-in">
          <h2>Amount Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={result.amountDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="bin" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
              <YAxis />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
              <Bar dataKey="count" fill="#4f6ef7" radius={[4, 4, 0, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card fade-in">
          <h2>Transaction Types</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={result.typeDistribution} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={90}
                label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`} animationDuration={800}>
                {result.typeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="charts-grid">
        <div className="card fade-in">
          <h2>Risk Level Breakdown</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={Object.entries(result.riskBreakdown).map(([name, value]) => ({ name, value }))}
                dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} animationDuration={800}>
                {Object.keys(result.riskBreakdown).map((key) => <Cell key={key} fill={RISK_COLORS[key] || "#999"} />)}
              </Pie>
              <Legend /><Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {result.timeSeries.length > 0 && (
          <div className="card fade-in">
            <h2>Transaction Volume Over Time</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={result.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis /><Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
                <Area type="monotone" dataKey="count" stroke="#4f6ef7" fill="#4f6ef7" fillOpacity={0.15} animationDuration={800} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {result.timeSeries.length > 0 && (
        <div className="charts-grid">
          <div className="card full-width fade-in">
            <h2>Daily Transaction Value</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={result.timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" /><YAxis />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}


/* ==================== AI REPORT TAB ==================== */
function ReportTab({ result }: { result: AnalysisResult }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  // Simple markdown-to-JSX renderer
  const renderMarkdown = (md: string) => {
    return md.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="report-h2">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="report-h3">{line.slice(4)}</h3>;
      if (line.startsWith("---")) return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "20px 0" }} />;
      if (line.startsWith("- ")) {
        const content = line.slice(2);
        return <li key={i} className="report-li">{renderInline(content)}</li>;
      }
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="report-p">{renderInline(line)}</p>;
    });
  };

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`card section report-card ${visible ? "fade-in" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>AI-Generated Analysis Report</h2>
        <button className="btn btn-secondary" onClick={() => {
          const blob = new Blob([result.narrative], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = "fraud_analysis_report.md"; a.click();
          URL.revokeObjectURL(url);
        }}>
          <FileText size={14} /> Export as Markdown
        </button>
      </div>
      <div className="report-content">
        {renderMarkdown(result.narrative)}
      </div>
    </div>
  );
}

/* ==================== FRAUD TAB ==================== */
function FraudTab({ result }: { result: AnalysisResult }) {
  const [sortCol, setSortCol] = useState<string>("fraud_score");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...result.flaggedTransactions].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortCol];
    const bv = (b as Record<string, unknown>)[sortCol];
    if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  return (
    <>
      <div className="charts-grid">
        <div className="card fade-in">
          <h2>Risk Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={Object.entries(result.riskBreakdown).map(([name, value]) => ({ name, value }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" /><YAxis />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={800}>
                {Object.keys(result.riskBreakdown).map((key) => <Cell key={key} fill={RISK_COLORS[key] || "#999"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {result.hourlyDistribution.length > 0 && (
          <div className="card fade-in">
            <h2><Clock size={16} /> Hourly Activity Pattern</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={result.hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} /><YAxis />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} labelFormatter={(h) => `${h}:00 - ${h}:59`} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="card section fade-in">
        <h2>Flagged Transactions ({result.flaggedTransactions.length})</h2>
        {result.flaggedTransactions.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>No flagged transactions. Adjust thresholds in Filters.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr>
                {["account_id", "amount", "type", "merchant", "date", "fraud_score", "risk_level", "fraud_reasons"].map((col) => (
                  <th key={col} onClick={() => handleSort(col)} style={{ cursor: "pointer" }}>
                    {col.replace("_", " ")} {sortCol === col ? (sortAsc ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={i}>
                    <td>{row.account_id}</td>
                    <td>${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{row.type}</td><td>{row.merchant}</td><td>{row.date || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{row.fraud_score.toFixed(1)}</td>
                    <td><span className={`badge badge-${row.risk_level}`}>{row.risk_level}</span></td>
                    <td style={{ fontSize: "0.75rem" }}>{row.fraud_reasons.replace(/;/g, ", ").replace(/, $/, "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}


/* ==================== CLUSTERS TAB ==================== */
function ClustersTab({ result }: { result: AnalysisResult }) {
  if (result.clusterData.length === 0) {
    return (
      <div className="card section">
        <h2>Anomaly Clustering</h2>
        <p style={{ color: "var(--text-secondary)" }}>Not enough data points for clustering (minimum 10 required).</p>
      </div>
    );
  }

  const clusterIds = [...new Set(result.clusterData.map((d) => d.cluster))].sort((a, b) => a - b);

  return (
    <>
      <div className="card section fade-in">
        <h2>DBSCAN Anomaly Clustering — Amount vs Z-Score</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 12 }}>
          Each point is a transaction. Colors represent behavioral clusters. Noise points (red) are outliers that don't fit any cluster pattern.
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" dataKey="amount" name="Amount" tickFormatter={(v) => `$${v.toLocaleString()}`} />
            <YAxis type="number" dataKey="zScore" name="Z-Score" />
            <ZAxis range={[30, 120]} />
            <Tooltip
              contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              formatter={(value: number, name: string) => [name === "Amount" ? `$${value.toLocaleString()}` : value.toFixed(2), name]}
              labelFormatter={() => ""}
            />
            {clusterIds.map((cid) => (
              <Scatter
                key={cid}
                name={cid === -1 ? "Outliers" : `Cluster ${cid}`}
                data={result.clusterData.filter((d) => d.cluster === cid)}
                fill={cid === -1 ? "#ef4444" : CLUSTER_COLORS[(cid + 1) % CLUSTER_COLORS.length]}
                opacity={0.7}
              />
            ))}
            <Legend />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="card section fade-in">
        <h2>Cluster Summary</h2>
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>Cluster</th><th>Transactions</th><th>Avg Amount</th><th>Avg Fraud Score</th><th>Risk Mix</th>
            </tr></thead>
            <tbody>
              {result.clusterSummary.map((c, i) => (
                <tr key={i}>
                  <td>
                    <span style={{
                      display: "inline-block", width: 10, height: 10, borderRadius: "50%", marginRight: 8,
                      background: c.clusterId === -1 ? "#ef4444" : CLUSTER_COLORS[(c.clusterId + 1) % CLUSTER_COLORS.length],
                    }} />
                    {c.cluster}
                  </td>
                  <td>{c.count.toLocaleString()}</td>
                  <td>${c.avgAmount.toLocaleString()}</td>
                  <td>{c.avgFraudScore}</td>
                  <td style={{ fontSize: "0.75rem" }}>
                    {Object.entries(c.riskMix).map(([level, count]) => (
                      <span key={level} className={`badge badge-${level}`} style={{ marginRight: 4 }}>
                        {level}: {count}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ==================== ACCOUNT PROFILES TAB ==================== */
function AccountProfilesTab({ result }: { result: AnalysisResult }) {
  const [sortCol, setSortCol] = useState("riskScore");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...result.accountProfiles].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sortCol];
    const bv = (b as Record<string, unknown>)[sortCol];
    if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(false); }
  };

  // Risk score distribution chart
  const riskDistData = [
    { range: "0-15", count: result.accountProfiles.filter((a) => a.riskScore < 15).length },
    { range: "15-30", count: result.accountProfiles.filter((a) => a.riskScore >= 15 && a.riskScore < 30).length },
    { range: "30-50", count: result.accountProfiles.filter((a) => a.riskScore >= 30 && a.riskScore < 50).length },
    { range: "50+", count: result.accountProfiles.filter((a) => a.riskScore >= 50).length },
  ];

  return (
    <>
      <div className="charts-grid">
        <div className="card fade-in">
          <h2>Account Risk Score Distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskDistData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="range" /><YAxis />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={800}>
                <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#ef4444" /><Cell fill="#dc2626" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card fade-in">
          <h2>Top 10 Riskiest Accounts</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={result.accountProfiles.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" /><YAxis type="category" dataKey="accountId" width={90} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
              <Bar dataKey="riskScore" name="Risk Score" radius={[0, 4, 4, 0]} animationDuration={800}>
                {result.accountProfiles.slice(0, 10).map((a, i) => (
                  <Cell key={i} fill={RISK_COLORS[a.riskLevel] || "#999"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card section fade-in">
        <h2>All Account Profiles ({result.accountProfiles.length})</h2>
        <div className="table-wrapper">
          <table>
            <thead><tr>
              {["accountId", "riskScore", "riskLevel", "txnCount", "totalSpent", "avgAmount", "flaggedCount", "merchantCount", "topMerchant", "reasons"].map((col) => (
                <th key={col} onClick={() => handleSort(col)} style={{ cursor: "pointer" }}>
                  {col.replace(/([A-Z])/g, " $1").trim()} {sortCol === col ? (sortAsc ? "↑" : "↓") : ""}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {sorted.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{a.accountId}</td>
                  <td style={{ fontWeight: 700 }}>{a.riskScore}</td>
                  <td><span className={`badge badge-${a.riskLevel}`}>{a.riskLevel}</span></td>
                  <td>{a.txnCount}</td>
                  <td>${a.totalSpent.toLocaleString()}</td>
                  <td>${a.avgAmount.toLocaleString()}</td>
                  <td>{a.flaggedCount > 0 ? <span className="badge badge-high">{a.flaggedCount}</span> : <span className="badge badge-low">0</span>}</td>
                  <td>{a.merchantCount}</td>
                  <td>{a.topMerchant}</td>
                  <td style={{ fontSize: "0.75rem", maxWidth: 200 }}>{a.reasons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}


/* ==================== NETWORK GRAPH TAB ==================== */
function NetworkTab({ result }: { result: AnalysisResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<{ id: string; type: string; risk: string; x: number; y: number; vx: number; vy: number }[]>([]);
  const animRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const nodes = nodesRef.current;

    ctx.clearRect(0, 0, W, H);

    // Draw links
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#888";
    ctx.lineWidth = 1;
    for (const link of result.networkLinks) {
      const src = nodes.find((n) => n.id === link.source);
      const tgt = nodes.find((n) => n.id === link.target);
      if (src && tgt) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Simple force simulation step
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const repulse = 800 / (dist * dist);
        nodes[i].vx -= (dx / dist) * repulse;
        nodes[i].vy -= (dy / dist) * repulse;
        nodes[j].vx += (dx / dist) * repulse;
        nodes[j].vy += (dy / dist) * repulse;
      }
    }

    for (const link of result.networkLinks) {
      const src = nodes.find((n) => n.id === link.source);
      const tgt = nodes.find((n) => n.id === link.target);
      if (src && tgt) {
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const attract = (dist - 100) * 0.005;
        src.vx += (dx / dist) * attract;
        src.vy += (dy / dist) * attract;
        tgt.vx -= (dx / dist) * attract;
        tgt.vy -= (dy / dist) * attract;
      }
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (W / 2 - node.x) * 0.001;
      node.vy += (H / 2 - node.y) * 0.001;
      node.vx *= 0.9;
      node.vy *= 0.9;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(20, Math.min(W - 20, node.x));
      node.y = Math.max(20, Math.min(H - 20, node.y));
    }

    // Draw nodes
    for (const node of nodes) {
      const isAccount = node.type === "account";
      const radius = isAccount ? 8 : 6;
      let color = isAccount ? "#4f6ef7" : "#10b981";
      if (node.risk === "high") color = "#ef4444";
      if (node.risk === "critical") color = "#dc2626";
      if (node.risk === "medium") color = "#f59e0b";

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#fff";
      ctx.font = "9px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(node.id.length > 12 ? node.id.slice(0, 12) + "…" : node.id, node.x, node.y - radius - 4);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [result.networkLinks]);

  useEffect(() => {
    if (result.networkNodes.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.parentElement?.clientWidth || 800;
    canvas.width = W;
    canvas.height = 500;

    nodesRef.current = result.networkNodes.map((n) => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 300,
      y: 250 + (Math.random() - 0.5) * 200,
      vx: 0, vy: 0,
    }));

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [result.networkNodes, draw]);

  if (result.networkNodes.length === 0) {
    return <div className="card section"><h2>Network Graph</h2><p style={{ color: "var(--text-secondary)" }}>No network data available.</p></div>;
  }

  return (
    <div className="card section fade-in">
      <h2>Account ↔ Merchant Network</h2>
      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 12 }}>
        Force-directed graph showing relationships between accounts (blue/colored by risk) and merchants (green). Edge thickness represents transaction volume.
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#4f6ef7", display: "inline-block" }} /> Account (low risk)
        </span>
        <span style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} /> Account (medium)
        </span>
        <span style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} /> Account (high/critical)
        </span>
        <span style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }} /> Merchant
        </span>
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, background: "var(--bg)" }} />
    </div>
  );
}

/* ==================== MERCHANTS TAB ==================== */
function MerchantsTab({ result }: { result: AnalysisResult }) {
  return (
    <>
      <div className="charts-grid">
        <div className="card full-width fade-in">
          <h2>Top 10 Merchants by Transaction Value</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={result.topMerchants} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="merchant" width={120} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card section fade-in">
        <h2>Merchant Details</h2>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Merchant</th><th>Total Value</th><th>Transactions</th><th>Avg Amount</th></tr></thead>
            <tbody>
              {result.topMerchants.map((m, i) => (
                <tr key={i}><td>{m.merchant}</td><td>${m.total.toLocaleString()}</td><td>{m.txnCount}</td><td>${m.avg.toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ==================== FORENSICS TAB ==================== */
function ForensicsTab({ result }: { result: AnalysisResult }) {
  return (
    <>
      <div className="charts-grid">
        <div className="card fade-in">
          <h2>Benford's Law Analysis</h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 12 }}>
            Deviation score: <strong>{result.benfordDeviation}</strong>
            {result.benfordDeviation > 15 ? " ⚠️ High deviation — possible data manipulation" : " ✓ Within normal range"}
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={result.benfordData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="digit" /><YAxis tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="expected" fill="#4f6ef7" name="Expected (Benford)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="observed" fill="#f59e0b" name="Observed" radius={[4, 4, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card fade-in">
          <h2>Type Spending Radar</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={result.typeDistribution.slice(0, 8)}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="type" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} />
              <Radar name="Total" dataKey="total" stroke="#4f6ef7" fill="#4f6ef7" fillOpacity={0.3} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="charts-grid">
        <div className="card full-width fade-in">
          <h2>Transaction Type Breakdown</h2>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Type</th><th>Count</th><th>Total Value</th><th>Avg Value</th><th>Share</th></tr></thead>
              <tbody>
                {result.typeDistribution.map((t, i) => {
                  const totalCount = result.typeDistribution.reduce((s, x) => s + x.count, 0);
                  return (
                    <tr key={i}><td>{t.type}</td><td>{t.count.toLocaleString()}</td><td>${t.total.toLocaleString()}</td><td>${t.avg.toLocaleString()}</td><td>{((t.count / totalCount) * 100).toFixed(1)}%</td></tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}


/* ==================== FILTER SIDEBAR ==================== */
function FilterSidebar({
  open, onClose, filters, onChange, merchants, onApply,
}: {
  open: boolean; onClose: () => void; filters: Filters;
  onChange: (f: Filters) => void; merchants: string[]; onApply: () => void;
}) {
  const toggleMerchant = (m: string) => {
    const current = filters.riskyMerchants;
    onChange({ ...filters, riskyMerchants: current.includes(m) ? current.filter((x) => x !== m) : [...current, m] });
  };

  return (
    <div className={`sidebar-panel ${open ? "open" : ""}`}>
      <h3>Filters & Thresholds <button className="theme-toggle" onClick={onClose}><X size={16} /></button></h3>
      <div className="filter-group"><label>Start Date</label><input type="date" value={filters.startDate} onChange={(e) => onChange({ ...filters, startDate: e.target.value })} /></div>
      <div className="filter-group"><label>End Date</label><input type="date" value={filters.endDate} onChange={(e) => onChange({ ...filters, endDate: e.target.value })} /></div>
      <div className="filter-group"><label>High Amount Threshold ($)</label><input type="number" min={0} value={filters.highAmountThreshold} onChange={(e) => onChange({ ...filters, highAmountThreshold: Number(e.target.value) })} /></div>
      <div className="filter-group"><label>Rapid Txn / Hour Threshold</label><input type="number" min={0} value={filters.rapidTxnThreshold} onChange={(e) => onChange({ ...filters, rapidTxnThreshold: Number(e.target.value) })} /></div>
      <div className="filter-group">
        <label>High-Risk Merchants</label>
        <div className="chip-container">
          {merchants.slice(0, 30).map((m) => (
            <span key={m} className={`chip ${filters.riskyMerchants.includes(m) ? "selected" : ""}`} onClick={() => toggleMerchant(m)}>{m}</span>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={onApply}>Apply & Re-analyze</button>
    </div>
  );
}

/* ==================== INSIGHTS GENERATOR ==================== */
function generateInsights(result: AnalysisResult) {
  const insights: { text: string; level: "info" | "warning" | "danger" | "success" }[] = [];
  const { summary } = result;

  if (summary.flaggedPct > 20) {
    insights.push({ text: `⚠️ ${summary.flaggedPct}% of transactions are flagged — this is unusually high and warrants investigation.`, level: "danger" });
  } else if (summary.flaggedPct > 5) {
    insights.push({ text: `${summary.flaggedPct}% of transactions flagged. Review the Fraud Detection tab for details.`, level: "warning" });
  } else if (summary.flaggedCount > 0) {
    insights.push({ text: `Only ${summary.flaggedPct}% flagged — your transaction data looks relatively clean.`, level: "success" });
  }

  if (summary.stdAmount > summary.avgAmount * 2) {
    insights.push({ text: `High variance detected: standard deviation ($${summary.stdAmount.toLocaleString()}) is more than 2x the mean ($${summary.avgAmount.toLocaleString()}).`, level: "warning" });
  }

  if (result.benfordDeviation > 15) {
    insights.push({ text: `Benford's Law deviation score is ${result.benfordDeviation} (threshold: 15). Leading digit distribution deviates significantly from expected patterns.`, level: "danger" });
  }

  const criticalCount = result.riskBreakdown.critical || 0;
  if (criticalCount > 0) {
    insights.push({ text: `${criticalCount} transaction(s) classified as CRITICAL risk — multiple fraud signals detected.`, level: "danger" });
  }

  const criticalAccounts = result.accountProfiles.filter((a) => a.riskLevel === "critical").length;
  if (criticalAccounts > 0) {
    insights.push({ text: `${criticalAccounts} account(s) have critical risk profiles. Check the Account Profiles tab.`, level: "danger" });
  }

  const noiseCluster = result.clusterSummary.find((c) => c.clusterId === -1);
  if (noiseCluster && noiseCluster.count > 0) {
    insights.push({ text: `DBSCAN clustering identified ${noiseCluster.count} outlier transactions that don't fit normal behavioral patterns.`, level: "warning" });
  }

  if (summary.uniqueAccounts === 1) {
    insights.push({ text: `All transactions belong to a single account. Upload multi-account data for richer analysis.`, level: "info" });
  }

  return insights;
}

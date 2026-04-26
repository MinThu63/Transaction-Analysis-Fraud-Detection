import type { ColumnMapping } from "../types";
import { ArrowRight, RotateCcw } from "lucide-react";

interface Props {
  columns: string[];
  preview: Record<string, unknown>[];
  totalRows: number;
  mapping: ColumnMapping;
  onMappingChange: (m: ColumnMapping) => void;
  onAnalyze: () => void;
  onReset: () => void;
}

export default function MappingSection({
  columns,
  preview,
  totalRows,
  mapping,
  onMappingChange,
  onAnalyze,
  onReset,
}: Props) {
  const update = (key: keyof ColumnMapping, val: string) => {
    onMappingChange({ ...mapping, [key]: val });
  };

  const fields: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
    { key: "amountCol", label: "Transaction Amount", required: true },
    { key: "accountCol", label: "Account ID", required: true },
    { key: "typeCol", label: "Transaction Type", required: true },
    { key: "merchantCol", label: "Merchant (optional)", required: false },
    { key: "dateCol", label: "Date / Timestamp (optional)", required: false },
  ];

  const canAnalyze = mapping.amountCol && mapping.accountCol && mapping.typeCol;

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h2>Data Preview — {totalRows.toLocaleString()} rows loaded</h2>
        <div className="preview-wrapper">
          <table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c}>{String(row[c] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mapping-section">
        <h2>Map Your Columns</h2>
        <div className="mapping-grid">
          {fields.map(({ key, label, required }) => (
            <div className="mapping-field" key={key}>
              <label>
                {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
              </label>
              <select value={mapping[key]} onChange={(e) => update(key, e.target.value)}>
                <option value="">— Select —</option>
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button className="btn btn-primary" disabled={!canAnalyze} onClick={onAnalyze}>
            <ArrowRight size={16} /> Run Analysis
          </button>
          <button className="btn btn-secondary" onClick={onReset}>
            <RotateCcw size={16} /> Start Over
          </button>
        </div>
      </div>
    </div>
  );
}

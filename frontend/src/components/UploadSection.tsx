import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, FileText } from "lucide-react";

interface Props {
  onUpload: (file: File) => void;
}

export default function UploadSection({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      onUpload(file);
    }
  };

  return (
    <div>
      <div
        className={`upload-area ${dragover ? "dragover" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
        onDragLeave={() => setDragover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragover(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <Upload size={48} style={{ color: "var(--accent)", marginBottom: 16 }} />
        <h2>Drop your transaction file here</h2>
        <p>or click to browse — supports CSV and Excel (.xlsx)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <div className="sample-section">
        <div className="sample-header">
          <span className="sample-divider-line" />
          <span className="sample-divider-text">No data? Try a sample file</span>
          <span className="sample-divider-line" />
        </div>
        <p className="sample-description">
          Download a pre-built dataset with 500 realistic transactions including outliers, multiple accounts, and varied merchants — perfect for exploring the dashboard.
        </p>
        <div className="sample-buttons">
          <a href="/api/sample/xlsx" download className="btn btn-secondary sample-btn">
            <FileSpreadsheet size={18} />
            <div>
              <span className="sample-btn-label">Excel File</span>
              <span className="sample-btn-sub">sample_transactions.xlsx</span>
            </div>
          </a>
          <a href="/api/sample/csv" download className="btn btn-secondary sample-btn">
            <FileText size={18} />
            <div>
              <span className="sample-btn-label">CSV File</span>
              <span className="sample-btn-sub">sample_transactions.csv</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

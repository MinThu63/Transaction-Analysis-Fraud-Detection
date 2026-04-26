from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import pandas as pd
import numpy as np
import io
import json
from typing import Optional
from analysis import TransactionAnalyzer

SAMPLE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="Transaction Analysis & Fraud Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer: Optional[TransactionAnalyzer] = None


@app.get("/api/sample/xlsx")
async def download_sample_xlsx():
    """Download sample Excel file for testing."""
    path = SAMPLE_DIR / "sample_transactions.xlsx"
    if not path.exists():
        return {"error": "Sample file not found. Run generate_sample.py first."}
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="sample_transactions.xlsx",
    )


@app.get("/api/sample/csv")
async def download_sample_csv():
    """Download sample CSV file for testing."""
    path = SAMPLE_DIR / "sample_transactions.csv"
    if not path.exists():
        return {"error": "Sample file not found. Run generate_sample.py first."}
    return FileResponse(
        path,
        media_type="text/csv",
        filename="sample_transactions.csv",
    )


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV or Excel file and return column names + preview."""
    global analyzer
    content = await file.read()
    buf = io.BytesIO(content)

    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(buf)
        elif file.filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(buf, engine="openpyxl")
        else:
            return {"error": "Unsupported file type. Use CSV or Excel."}
    except Exception as e:
        return {"error": f"Failed to read file: {str(e)}"}

    analyzer = TransactionAnalyzer(df)
    preview = df.head(10).fillna("").to_dict(orient="records")
    columns = list(df.columns)

    return {"columns": columns, "preview": preview, "totalRows": len(df)}


@app.post("/api/analyze")
async def analyze(body: str = Form(...)):
    """Run full analysis with column mapping and thresholds."""
    global analyzer
    if analyzer is None:
        return {"error": "No file uploaded yet."}

    params = json.loads(body)
    result = analyzer.run_analysis(params)
    return result


@app.get("/api/download-flagged")
async def download_flagged():
    """Download flagged transactions as CSV."""
    global analyzer
    if analyzer is None or analyzer.flagged_df is None:
        return {"error": "No analysis run yet."}

    buf = io.StringIO()
    analyzer.flagged_df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=flagged_transactions.csv"},
    )


@app.get("/api/download-full")
async def download_full():
    """Download full analyzed dataset as CSV."""
    global analyzer
    if analyzer is None or analyzer.analyzed_df is None:
        return {"error": "No analysis run yet."}

    buf = io.StringIO()
    analyzer.analyzed_df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=full_analysis.csv"},
    )

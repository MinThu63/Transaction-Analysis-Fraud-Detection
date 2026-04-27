<div align="center">

# 🛡️ Transaction Analysis & Fraud Detection Dashboard

A full-stack web application that analyzes financial transaction data and detects potential fraud using statistical methods, machine learning clustering, and forensic accounting techniques.

**React + TypeScript** · **FastAPI + Python** · **Recharts** · **scikit-learn**

[Features](#features) · [Architecture](#architecture) · [Getting Started](#getting-started) · [Screenshots](#screenshots)

</div>

---

## Table of Contents

- [Motivation](#motivation)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Technical Highlights](#technical-highlights)
- [Getting Started](#getting-started)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [License](#license)

---

## Motivation

Fraud detection in financial systems is a critical challenge — global card fraud losses alone exceed $30 billion annually. Traditional rule-based systems catch obvious cases but miss sophisticated patterns that require statistical analysis.

This project was built to demonstrate how modern web technologies and data science techniques can be combined into a practical, interactive tool that:

- Applies **real forensic accounting methods** (Benford's Law, Z-score anomaly detection) used by auditors and investigators
- Uses **unsupervised machine learning** (DBSCAN clustering) to discover hidden behavioral patterns without labeled training data
- Provides **holistic risk profiling** at both the transaction and account level, rather than simple threshold-based flagging
- Generates **natural-language analyst reports** that translate raw numbers into actionable insights
- Visualizes **entity relationships** through network graphs to reveal coordinated fraud patterns

The goal is not just to flag suspicious transactions, but to tell the story behind the data — making it accessible to analysts, auditors, and decision-makers who may not have a data science background.

---

## Features

### Data Ingestion
- Drag-and-drop file upload (CSV and Excel)
- Dynamic column mapping — works with any schema, no fixed format required
- Automatic data cleaning with row-drop reporting
- Downloadable sample dataset (500 realistic transactions) for instant testing

### Multi-Signal Fraud Detection Engine
- **Z-Score Anomaly Detection** — flags transactions that deviate significantly from an account's normal spending pattern
- **IQR Outlier Detection** — identifies global statistical outliers using the interquartile range method
- **Benford's Law Analysis** — compares leading digit distribution against the expected mathematical distribution to detect data fabrication
- **Transaction Velocity Analysis** — detects rapid-fire transactions within configurable time windows
- **Off-Hours Detection** — flags weekend and night-time (midnight–6am) transactions
- **Round-Number Bias Detection** — identifies suspiciously round transaction amounts
- **Risky Merchant Flagging** — user-configurable merchant watchlist
- **Composite Fraud Scoring** — weighted combination of all signals into a single risk score per transaction

### Machine Learning
- **DBSCAN Clustering** — unsupervised anomaly clustering that groups transactions by behavioral similarity and isolates outliers that don't fit any pattern
- **Account Risk Profiling** — holistic per-account scoring based on flagged ratio, spending volatility, merchant diversity, and temporal patterns

### Visualization & Reporting
- 8 interactive dashboard tabs: Overview, AI Report, Fraud Detection, Anomaly Clusters, Account Profiles, Network Graph, Merchants, Forensics
- Interactive charts: histograms, pie charts, area charts, radar charts, scatter plots, horizontal bar charts
- **Force-directed network graph** — canvas-rendered visualization of account↔merchant relationships colored by risk level
- **AI-generated narrative report** — executive summary with risk breakdown, high-risk accounts, clustering insights, and spending pattern analysis (exportable as Markdown)
- Animated metric counters with eased transitions
- Staggered fade-in card animations
- Sortable tables with column-click sorting

### UX
- Dark / light theme with system preference detection
- Responsive layout
- Filter sidebar with date range, amount thresholds, velocity thresholds, and merchant chip selector
- CSV export for both flagged transactions and full analyzed dataset
- Markdown export for the AI report

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│                                                         │
│  Upload → Column Mapping → Dashboard (8 tabs)           │
│  Recharts · Canvas Network Graph · Animated Metrics     │
│                                                         │
│  Vite dev server :5173  ──proxy──►  /api/*              │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP/JSON
┌──────────────────────────▼──────────────────────────────┐
│                   Backend (FastAPI)                       │
│                                                         │
│  POST /api/upload      → parse file, return preview     │
│  POST /api/analyze     → run full analysis pipeline     │
│  GET  /api/sample/xlsx → download sample Excel file     │
│  GET  /api/sample/csv  → download sample CSV file       │
│  GET  /api/download-flagged → export flagged as CSV     │
│  GET  /api/download-full    → export full dataset       │
│                                                         │
│  Analysis Pipeline:                                     │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐ │
│  │ Cleaning │→│ Fraud    │→│ DBSCAN  │→│ Account  │  │
│  │ & Mapping│  │ Scoring  │  │Clustering│  │ Profiling│  │
│  └─────────┘  └──────────┘  └─────────┘  └──────────┘ │
│       ↓             ↓             ↓            ↓        │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Network  │  │ Benford  │  │Narrative│  │ Response│  │
│  │ Graph    │  │ Analysis │  │Generator│  │ Builder │  │
│  └──────────┘  └──────────┘  └─────────┘  └─────────┘ │
│                                                         │
│  Uvicorn server :8000                                   │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
├── backend/
│   ├── main.py                  # FastAPI app — routes, file upload, exports
│   ├── analysis.py              # TransactionAnalyzer — fraud scoring, DBSCAN,
│   │                            #   account profiling, network graph, narrative
│   ├── generate_sample.py       # Generates 500-row sample dataset with outliers
│   ├── requirements.txt         # Python dependencies
│   ├── sample_transactions.csv  # Pre-generated sample data
│   └── sample_transactions.xlsx # Pre-generated sample data (Excel)
│
├── frontend/
│   ├── index.html               # Entry HTML
│   ├── package.json             # Node dependencies
│   ├── tsconfig.json            # TypeScript config
│   ├── vite.config.ts           # Vite config with API proxy
│   └── src/
│       ├── main.tsx             # React entry point
│       ├── App.tsx              # Root component — upload/mapping/dashboard flow
│       ├── types.ts             # TypeScript interfaces for API responses
│       ├── index.css            # Global styles, dark/light theme, animations
│       └── components/
│           ├── Dashboard.tsx    # Main dashboard — 8 tabs, metrics, charts,
│           │                    #   network graph, filter sidebar, insights
│           ├── UploadSection.tsx # Drag-and-drop upload + sample file downloads
│           └── MappingSection.tsx# Column mapping UI + data preview table
│
└── README.md
```

---

## Technical Highlights

These are the techniques and design decisions that go beyond a typical CRUD app:

### Fraud Scoring — Composite, Not Binary
Rather than a simple "flagged / not flagged" binary, each transaction receives a weighted fraud score from multiple independent signals. This allows risk classification into four tiers (low, medium, high, critical) and lets analysts prioritize by severity.

### Benford's Law (Forensic Accounting)
Benford's Law states that in naturally occurring datasets, the leading digit "1" appears ~30% of the time, "2" ~17.6%, and so on. Fabricated or manipulated financial data often violates this distribution. The app computes a deviation score and visualizes expected vs. observed distributions side by side.

### DBSCAN Clustering (Unsupervised ML)
DBSCAN (Density-Based Spatial Clustering of Applications with Noise) groups transactions by behavioral similarity in a multi-dimensional feature space (amount, z-score, hour of day, day of week). Unlike K-means, DBSCAN doesn't require specifying the number of clusters and naturally identifies outliers as "noise" points — exactly what we want for anomaly detection.

### Account-Level Risk Profiling
Individual transaction flags can miss patterns that only emerge at the account level. The profiling engine scores each account based on:
- Proportion of flagged transactions
- Maximum fraud score observed
- Spending volatility (coefficient of variation)
- Merchant diversity (single-merchant accounts are suspicious)
- Off-hours transaction ratio

### Force-Directed Network Graph
A custom canvas-rendered force simulation visualizes account↔merchant relationships. Nodes are colored by risk level, and the physics-based layout naturally clusters tightly connected entities together — making coordinated fraud patterns visually apparent.

### AI Narrative Report
The backend generates a structured Markdown report that reads like an analyst's findings — executive summary, risk breakdown, high-risk account callouts, clustering insights, Benford's Law alerts, and spending pattern analysis. This bridges the gap between raw data and actionable intelligence.

### Zero-Config Column Mapping
The app doesn't require a fixed CSV schema. Users map their columns through a UI, and the backend builds a clean internal representation. This makes it usable with real-world datasets from any source.

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend

```bash
cd backend
pip install -r requirements.txt
python generate_sample.py       # generates sample_transactions.xlsx and .csv
uvicorn main:app --reload       # starts API on http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # starts dev server on http://localhost:5173
```

### Usage

1. Open **http://localhost:5173**
2. Download a sample file from the landing page (or upload your own CSV/Excel)
3. Map your columns: Amount, Account ID, Type (Merchant and Date are optional)
4. Click **Run Analysis**
5. Explore the 8 dashboard tabs
6. Use the **Filters** sidebar to adjust thresholds and re-analyze
7. Export flagged transactions as CSV or the AI report as Markdown

---

## Screenshots

  <img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/578b6ace-45eb-4805-8822-702effdba1d6" />

> <img width="2559" height="1141" alt="image" src="https://github.com/user-attachments/assets/1e61f264-8d28-4b3e-b600-52d303810f72" />
  <img width="2559" height="1109" alt="image" src="https://github.com/user-attachments/assets/ac5177cf-d869-49b9-a175-3d9f49c30178" />
  <img width="2559" height="1211" alt="image" src="https://github.com/user-attachments/assets/1dba4f82-54ff-4d11-abcd-278ea3695962" />
  <img width="2559" height="1422" alt="image" src="https://github.com/user-attachments/assets/c5aa5902-a1a6-4354-a4f0-83fe21d20f1f" />
  <img width="2559" height="1324" alt="image" src="https://github.com/user-attachments/assets/1dd842ca-b2f9-489b-bea5-ea7dd84b8627" />
  <img width="2551" height="1342" alt="image" src="https://github.com/user-attachments/assets/4a41f0c9-3c6f-43b6-ab52-395eed0ff270" />
  <img width="2559" height="1349" alt="image" src="https://github.com/user-attachments/assets/5cf0b447-386a-4b2b-b66b-df3e33c4a48f" />
  <img width="2387" height="1206" alt="image" src="https://github.com/user-attachments/assets/c8fe01f1-0dec-430b-9c52-4c3d29c5d046" />
  <img width="2329" height="1341" alt="image" src="https://github.com/user-attachments/assets/c69dbbf5-bebe-444d-aabe-27a96c0604d1" />
  <img width="2261" height="929" alt="image" src="https://github.com/user-attachments/assets/3e681b4f-7a45-4b40-9bc5-91997cf46283" />
  <img width="2383" height="1369" alt="image" src="https://github.com/user-attachments/assets/832e6524-0210-4239-9e5a-cd41cba659b5" />
  <img width="1886" height="1206" alt="image" src="https://github.com/user-attachments/assets/bb04acf8-0fff-4f94-9076-30640a98a262" />
  <img width="1032" height="960" alt="image" src="https://github.com/user-attachments/assets/156bcf2d-c0b6-4899-abf9-7a17d57c2715" />


  

  









>
> Place images in a `screenshots/` folder and reference them like:
> ```
> ![Overview Dashboard](screenshots/overview.png)
> ```

---

## Roadmap

- [ ] **Real-time streaming** — WebSocket-based live transaction monitoring
- [ ] **Isolation Forest** — add a second ML model for comparison with DBSCAN
- [ ] **Time-series anomaly detection** — detect unusual spikes in daily volume using Prophet or ARIMA
- [ ] **PDF report export** — one-click professional PDF generation with charts embedded
- [ ] **User authentication** — multi-user support with saved analysis history
- [ ] **Database persistence** — PostgreSQL backend for storing uploaded datasets and results
- [ ] **Geolocation analysis** — map-based visualization if location data is available
- [ ] **Custom scoring weights** — let users adjust the relative importance of each fraud signal
- [ ] **API mode** — headless JSON API for integration into existing pipelines
- [ ] **Docker deployment** — single `docker-compose up` for production-ready setup

---

## License

This project is licensed under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

import pandas as pd
import numpy as np
from scipy import stats
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from typing import Dict, Any, Optional, List


class TransactionAnalyzer:
    """Advanced transaction analysis with multi-signal fraud scoring."""

    def __init__(self, raw_df: pd.DataFrame):
        self.raw_df = raw_df.copy()
        self.analyzed_df: Optional[pd.DataFrame] = None
        self.flagged_df: Optional[pd.DataFrame] = None

    def run_analysis(self, params: Dict[str, Any]) -> Dict[str, Any]:
        df = self.raw_df.copy()

        # --- Column mapping ---
        amount_col = params.get("amountCol", "")
        account_col = params.get("accountCol", "")
        type_col = params.get("typeCol", "")
        merchant_col = params.get("merchantCol", "")
        date_col = params.get("dateCol", "")

        if not amount_col or not account_col or not type_col:
            return {"error": "Amount, Account ID, and Type columns are required."}

        # Build the mapped dataframe from selected columns to avoid
        # duplicate column names when source columns already match targets.
        mapped = pd.DataFrame()
        mapped["amount"] = df[amount_col]
        mapped["account_id"] = df[account_col]
        mapped["type"] = df[type_col]
        mapped["merchant"] = df[merchant_col] if merchant_col and merchant_col in df.columns else "unknown"
        if date_col and date_col in df.columns:
            mapped["date"] = df[date_col]
        df = mapped

        # --- Cleaning ---
        initial = len(df)
        df.dropna(how="all", inplace=True)
        df.dropna(axis=1, how="all", inplace=True)
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
        df.dropna(subset=["amount"], inplace=True)
        df["type"] = df["type"].fillna("unknown").astype(str)
        df["account_id"] = df["account_id"].fillna("unknown").astype(str)
        df["merchant"] = df["merchant"].fillna("unknown").astype(str)

        has_date = "date" in df.columns
        if has_date:
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            if df["date"].isna().all():
                has_date = False

        rows_dropped = initial - len(df)

        # --- Date filter ---
        start_date = params.get("startDate")
        end_date = params.get("endDate")
        if start_date and end_date and has_date:
            df = df[
                (df["date"] >= pd.to_datetime(start_date))
                & (df["date"] <= pd.to_datetime(end_date))
            ]

        # --- Thresholds ---
        high_amount_threshold = params.get("highAmountThreshold", 0)
        rapid_txn_threshold = params.get("rapidTxnThreshold", 0)
        risky_merchants: List[str] = params.get("riskyMerchants", [])

        # ===================== FRAUD SCORING =====================
        df["fraud_score"] = 0.0
        df["fraud_reasons"] = ""

        # 1. Z-score anomaly (per account)
        df["acct_mean"] = df.groupby("account_id")["amount"].transform("mean")
        df["acct_std"] = df.groupby("account_id")["amount"].transform("std").fillna(0)
        df["z_score"] = np.where(
            df["acct_std"] > 0,
            (df["amount"] - df["acct_mean"]) / df["acct_std"],
            0,
        )
        z_mask = df["z_score"] > 2
        df.loc[z_mask, "fraud_score"] += df.loc[z_mask, "z_score"] * 10
        df.loc[z_mask, "fraud_reasons"] += "high_zscore;"

        # 2. Global statistical outlier (IQR method)
        q1 = df["amount"].quantile(0.25)
        q3 = df["amount"].quantile(0.75)
        iqr = q3 - q1
        upper_fence = q3 + 1.5 * iqr
        iqr_mask = df["amount"] > upper_fence
        df.loc[iqr_mask, "fraud_score"] += 15
        df.loc[iqr_mask, "fraud_reasons"] += "iqr_outlier;"

        # 3. High-value threshold (user-defined)
        if high_amount_threshold > 0:
            hv_mask = df["amount"] > high_amount_threshold
            df.loc[hv_mask, "fraud_score"] += 20
            df.loc[hv_mask, "fraud_reasons"] += "high_value;"

        # 4. Rapid transactions (velocity check)
        if rapid_txn_threshold > 0 and has_date:
            df_sorted = df.sort_values(["account_id", "date"])
            df_sorted["time_diff"] = (
                df_sorted.groupby("account_id")["date"]
                .diff()
                .dt.total_seconds()
                .fillna(np.inf)
            )
            rapid_mask = df_sorted["time_diff"] < 3600
            rapid_counts = df_sorted[rapid_mask].groupby("account_id").size()
            rapid_ids = rapid_counts[rapid_counts >= rapid_txn_threshold].index
            vel_mask = df["account_id"].isin(rapid_ids)
            df.loc[vel_mask, "fraud_score"] += 25
            df.loc[vel_mask, "fraud_reasons"] += "rapid_velocity;"

        # 5. Weekend / off-hours
        if has_date:
            weekend_mask = df["date"].dt.weekday >= 5
            df.loc[weekend_mask, "fraud_score"] += 5
            df.loc[weekend_mask, "fraud_reasons"] += "weekend;"

            night_mask = df["date"].dt.hour.isin([0, 1, 2, 3, 4, 5])
            df.loc[night_mask, "fraud_score"] += 8
            df.loc[night_mask, "fraud_reasons"] += "night_hours;"

        # 6. Risky merchants
        if risky_merchants:
            rm_mask = df["merchant"].isin(risky_merchants)
            df.loc[rm_mask, "fraud_score"] += 20
            df.loc[rm_mask, "fraud_reasons"] += "risky_merchant;"

        # 7. Benford's Law analysis on leading digits
        benford_expected = {1: 30.1, 2: 17.6, 3: 12.5, 4: 9.7, 5: 7.9, 6: 6.7, 7: 5.8, 8: 5.1, 9: 4.6}
        amounts_positive = df[df["amount"] > 0]["amount"]
        if len(amounts_positive) >= 50:
            leading_digits = amounts_positive.apply(lambda x: int(str(abs(x)).lstrip("0").lstrip(".")[0]) if x != 0 else 0)
            leading_digits = leading_digits[leading_digits > 0]
            observed = leading_digits.value_counts(normalize=True).reindex(range(1, 10), fill_value=0) * 100
            benford_deviation = sum(
                abs(observed.get(d, 0) - benford_expected[d]) for d in range(1, 10)
            )
        else:
            benford_deviation = 0.0
            observed = pd.Series(dtype=float)

        # 8. Round-number bias detection
        round_mask = df["amount"].apply(lambda x: x == int(x) and x % 100 == 0)
        df.loc[round_mask, "fraud_score"] += 5
        df.loc[round_mask, "fraud_reasons"] += "round_number;"

        # --- Risk level classification ---
        df["risk_level"] = "low"
        df.loc[df["fraud_score"] >= 15, "risk_level"] = "medium"
        df.loc[df["fraud_score"] >= 30, "risk_level"] = "high"
        df.loc[df["fraud_score"] >= 50, "risk_level"] = "critical"

        df["flagged"] = df["fraud_score"] >= 15

        self.analyzed_df = df
        self.flagged_df = df[df["flagged"]].copy()

        # ===================== ANOMALY CLUSTERING (DBSCAN) =====================
        cluster_data = []
        cluster_summary = []
        try:
            features_for_cluster = ["amount", "z_score"]
            if has_date:
                df["hour_of_day"] = df["date"].dt.hour.fillna(12)
                df["day_of_week"] = df["date"].dt.weekday.fillna(3)
                features_for_cluster += ["hour_of_day", "day_of_week"]

            X = df[features_for_cluster].fillna(0).values
            if len(X) >= 10:
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X)
                db = DBSCAN(eps=1.2, min_samples=5)
                df["cluster"] = db.fit_predict(X_scaled)

                for cid in sorted(df["cluster"].unique()):
                    if cid == -1:
                        label = "Noise / Outliers"
                    else:
                        label = f"Cluster {cid}"
                    subset = df[df["cluster"] == cid]
                    cluster_summary.append({
                        "cluster": label,
                        "clusterId": int(cid),
                        "count": len(subset),
                        "avgAmount": round(subset["amount"].mean(), 2),
                        "avgFraudScore": round(subset["fraud_score"].mean(), 1),
                        "riskMix": subset["risk_level"].value_counts().to_dict(),
                    })

                # Scatter data for visualization (amount vs z_score, colored by cluster)
                sample = df.sample(min(300, len(df)), random_state=42)
                for _, row in sample.iterrows():
                    cluster_data.append({
                        "amount": round(float(row["amount"]), 2),
                        "zScore": round(float(row["z_score"]), 2),
                        "cluster": int(row["cluster"]),
                        "riskLevel": row["risk_level"],
                        "account": row["account_id"],
                    })
        except Exception:
            pass

        # ===================== ACCOUNT RISK PROFILES =====================
        acct_profiles = []
        try:
            acct_grp = df.groupby("account_id")
            for acct_id, grp in acct_grp:
                risk_score = 0.0
                reasons = []

                # Factor 1: proportion of flagged transactions
                flag_ratio = grp["flagged"].mean()
                risk_score += flag_ratio * 30
                if flag_ratio > 0.3:
                    reasons.append(f"{flag_ratio*100:.0f}% flagged")

                # Factor 2: max fraud score in account
                max_fs = grp["fraud_score"].max()
                risk_score += min(max_fs, 50) * 0.4
                if max_fs >= 50:
                    reasons.append("critical transactions")

                # Factor 3: spending volatility
                cv = grp["amount"].std() / grp["amount"].mean() if grp["amount"].mean() > 0 else 0
                if cv > 1.5:
                    risk_score += 15
                    reasons.append("high volatility")

                # Factor 4: merchant diversity (low = suspicious)
                merchant_count = grp["merchant"].nunique()
                if merchant_count == 1 and len(grp) > 5:
                    risk_score += 10
                    reasons.append("single merchant")

                # Factor 5: weekend/night ratio
                if has_date:
                    offhour = grp["date"].dropna()
                    if len(offhour) > 0:
                        offhour_ratio = ((offhour.dt.weekday >= 5) | (offhour.dt.hour < 6)).mean()
                        if offhour_ratio > 0.5:
                            risk_score += 10
                            reasons.append(f"{offhour_ratio*100:.0f}% off-hours")

                level = "low"
                if risk_score >= 15:
                    level = "medium"
                if risk_score >= 30:
                    level = "high"
                if risk_score >= 50:
                    level = "critical"

                acct_profiles.append({
                    "accountId": str(acct_id),
                    "txnCount": len(grp),
                    "totalSpent": round(grp["amount"].sum(), 2),
                    "avgAmount": round(grp["amount"].mean(), 2),
                    "riskScore": round(risk_score, 1),
                    "riskLevel": level,
                    "flaggedCount": int(grp["flagged"].sum()),
                    "reasons": "; ".join(reasons) if reasons else "none",
                    "topMerchant": grp["merchant"].value_counts().index[0] if len(grp) > 0 else "unknown",
                    "merchantCount": merchant_count,
                })

            acct_profiles.sort(key=lambda x: x["riskScore"], reverse=True)
        except Exception:
            pass

        # ===================== NETWORK GRAPH DATA =====================
        network_nodes = []
        network_links = []
        try:
            # Build account → merchant edges with weights
            edge_df = df.groupby(["account_id", "merchant"]).agg(
                weight=("amount", "sum"), count=("amount", "size")
            ).reset_index()

            # Only keep top connections to avoid clutter
            edge_df = edge_df.sort_values("weight", ascending=False).head(80)

            seen_nodes = set()
            for _, row in edge_df.iterrows():
                acct = str(row["account_id"])
                merch = str(row["merchant"])
                if acct not in seen_nodes:
                    acct_risk = "low"
                    for p in acct_profiles:
                        if p["accountId"] == acct:
                            acct_risk = p["riskLevel"]
                            break
                    network_nodes.append({"id": acct, "type": "account", "risk": acct_risk})
                    seen_nodes.add(acct)
                if merch not in seen_nodes:
                    network_nodes.append({"id": merch, "type": "merchant", "risk": "none"})
                    seen_nodes.add(merch)
                network_links.append({
                    "source": acct,
                    "target": merch,
                    "value": round(float(row["weight"]), 2),
                    "count": int(row["count"]),
                })
        except Exception:
            pass

        # ===================== BUILD RESPONSE =====================
        total = len(df)
        flagged_count = len(self.flagged_df)

        # Summary metrics
        summary = {
            "totalTransactions": total,
            "avgAmount": round(df["amount"].mean(), 2) if total > 0 else 0,
            "maxAmount": round(df["amount"].max(), 2) if total > 0 else 0,
            "minAmount": round(df["amount"].min(), 2) if total > 0 else 0,
            "medianAmount": round(df["amount"].median(), 2) if total > 0 else 0,
            "stdAmount": round(df["amount"].std(), 2) if total > 0 else 0,
            "flaggedCount": flagged_count,
            "flaggedPct": round(flagged_count / total * 100, 1) if total > 0 else 0,
            "rowsDropped": rows_dropped,
            "uniqueAccounts": df["account_id"].nunique(),
            "uniqueMerchants": df["merchant"].nunique(),
            "uniqueTypes": df["type"].nunique(),
        }

        # Risk breakdown
        risk_breakdown = (
            df["risk_level"]
            .value_counts()
            .reindex(["low", "medium", "high", "critical"], fill_value=0)
            .to_dict()
        )

        # Amount distribution (histogram bins)
        hist_values, hist_edges = np.histogram(df["amount"].dropna(), bins=30)
        amount_distribution = [
            {"bin": f"{hist_edges[i]:.0f}-{hist_edges[i+1]:.0f}", "count": int(hist_values[i])}
            for i in range(len(hist_values))
        ]

        # Type distribution
        type_dist = (
            df.groupby("type")
            .agg(count=("amount", "size"), total=("amount", "sum"), avg=("amount", "mean"))
            .reset_index()
        )
        type_dist["total"] = type_dist["total"].round(2)
        type_dist["avg"] = type_dist["avg"].round(2)
        type_distribution = type_dist.to_dict(orient="records")

        # Top merchants
        top_merchants = (
            df.groupby("merchant")["amount"]
            .agg(["sum", "count", "mean"])
            .reset_index()
            .rename(columns={"sum": "total", "count": "txnCount", "mean": "avg"})
            .sort_values("total", ascending=False)
            .head(10)
        )
        top_merchants["total"] = top_merchants["total"].round(2)
        top_merchants["avg"] = top_merchants["avg"].round(2)
        top_merchants_list = top_merchants.to_dict(orient="records")

        # Account summary
        acct_summary = (
            df.groupby("account_id")
            .agg(
                txnCount=("amount", "size"),
                totalSpent=("amount", "sum"),
                avgAmount=("amount", "mean"),
                maxAmount=("amount", "max"),
                flaggedCount=("flagged", "sum"),
            )
            .reset_index()
            .sort_values("totalSpent", ascending=False)
            .head(20)
        )
        acct_summary = acct_summary.round(2)
        account_summary = acct_summary.to_dict(orient="records")

        # Time series (daily aggregation)
        time_series = []
        if has_date:
            daily = (
                df.dropna(subset=["date"])
                .set_index("date")
                .resample("D")
                .agg(count=("amount", "size"), total=("amount", "sum"))
                .reset_index()
            )
            daily["total"] = daily["total"].round(2)
            daily["date"] = daily["date"].dt.strftime("%Y-%m-%d")
            time_series = daily.to_dict(orient="records")

        # Hourly distribution
        hourly_dist = []
        if has_date:
            hourly = df.dropna(subset=["date"]).copy()
            hourly["hour"] = hourly["date"].dt.hour
            hourly_agg = hourly.groupby("hour").agg(count=("amount", "size"), total=("amount", "sum")).reset_index()
            hourly_agg["total"] = hourly_agg["total"].round(2)
            hourly_dist = hourly_agg.to_dict(orient="records")

        # Benford's Law data
        benford_data = []
        for d in range(1, 10):
            benford_data.append({
                "digit": d,
                "expected": benford_expected[d],
                "observed": round(observed.get(d, 0), 1) if len(observed) > 0 else 0,
            })

        # Flagged transactions (top 100 by score)
        flagged_list = (
            self.flagged_df.sort_values("fraud_score", ascending=False)
            .head(100)
            .fillna("")
        )
        # Convert date to string for JSON
        if "date" in flagged_list.columns:
            flagged_list["date"] = flagged_list["date"].apply(
                lambda x: x.strftime("%Y-%m-%d %H:%M") if pd.notna(x) else ""
            )
        flagged_records = flagged_list[
            ["account_id", "amount", "type", "merchant", "date", "fraud_score", "risk_level", "fraud_reasons"]
            if "date" in flagged_list.columns
            else ["account_id", "amount", "type", "merchant", "fraud_score", "risk_level", "fraud_reasons"]
        ].to_dict(orient="records")

        # ===================== AI NARRATIVE SUMMARY =====================
        narrative = self._generate_narrative(df, summary_data={
            "total": total, "flagged_count": flagged_count, "has_date": has_date,
            "benford_deviation": benford_deviation, "risk_breakdown": risk_breakdown,
            "acct_profiles": acct_profiles, "cluster_summary": cluster_summary,
        })

        return {
            "summary": summary,
            "riskBreakdown": risk_breakdown,
            "amountDistribution": amount_distribution,
            "typeDistribution": type_distribution,
            "topMerchants": top_merchants_list,
            "accountSummary": account_summary,
            "timeSeries": time_series,
            "hourlyDistribution": hourly_dist,
            "benfordData": benford_data,
            "benfordDeviation": round(benford_deviation, 2),
            "flaggedTransactions": flagged_records,
            "merchants": sorted(df["merchant"].unique().tolist()),
            "clusterData": cluster_data,
            "clusterSummary": cluster_summary,
            "accountProfiles": acct_profiles,
            "networkNodes": network_nodes,
            "networkLinks": network_links,
            "narrative": narrative,
        }

    def _generate_narrative(self, df: pd.DataFrame, summary_data: Dict) -> str:
        """Generate a natural-language analyst report from the data."""
        total = summary_data["total"]
        flagged = summary_data["flagged_count"]
        risk = summary_data["risk_breakdown"]
        profiles = summary_data["acct_profiles"]
        clusters = summary_data["cluster_summary"]
        benford_dev = summary_data["benford_deviation"]

        lines = []
        lines.append(f"## Executive Summary\n")
        lines.append(
            f"Analysis of **{total:,}** transactions across "
            f"**{df['account_id'].nunique()}** accounts and "
            f"**{df['merchant'].nunique()}** merchants."
        )

        # Flagged overview
        pct = round(flagged / total * 100, 1) if total > 0 else 0
        if pct > 20:
            lines.append(
                f"\n⚠️ **{flagged:,} transactions ({pct}%)** were flagged as suspicious — "
                f"this is an unusually high rate that warrants immediate review."
            )
        elif pct > 5:
            lines.append(
                f"\n**{flagged:,} transactions ({pct}%)** were flagged. "
                f"This is a moderate flag rate — targeted investigation is recommended."
            )
        elif flagged > 0:
            lines.append(
                f"\n**{flagged:,} transactions ({pct}%)** were flagged. "
                f"The overall dataset appears relatively clean."
            )
        else:
            lines.append(f"\nNo transactions were flagged. The dataset appears clean.")

        # Risk breakdown
        critical = risk.get("critical", 0)
        high = risk.get("high", 0)
        if critical > 0 or high > 0:
            lines.append(f"\n### Risk Breakdown")
            lines.append(
                f"- **Critical**: {critical} | **High**: {high} | "
                f"**Medium**: {risk.get('medium', 0)} | **Low**: {risk.get('low', 0)}"
            )

        # Top risky accounts
        risky_accts = [p for p in profiles if p["riskLevel"] in ("high", "critical")]
        if risky_accts:
            lines.append(f"\n### High-Risk Accounts")
            for a in risky_accts[:5]:
                lines.append(
                    f"- **{a['accountId']}** — risk score {a['riskScore']}, "
                    f"{a['flaggedCount']} flagged txns, "
                    f"${a['totalSpent']:,.2f} total spend. Reasons: {a['reasons']}"
                )

        # Clustering insights
        noise_cluster = [c for c in clusters if c["clusterId"] == -1]
        if noise_cluster and noise_cluster[0]["count"] > 0:
            nc = noise_cluster[0]
            lines.append(f"\n### Anomaly Clustering")
            lines.append(
                f"DBSCAN identified **{nc['count']} outlier transactions** that don't fit "
                f"normal behavioral patterns (avg amount: ${nc['avgAmount']:,.2f}, "
                f"avg fraud score: {nc['avgFraudScore']})."
            )
        normal_clusters = [c for c in clusters if c["clusterId"] >= 0]
        if normal_clusters:
            lines.append(f"{len(normal_clusters)} behavioral cluster(s) were identified in the data.")

        # Benford's Law
        if benford_dev > 15:
            lines.append(f"\n### Benford's Law Alert")
            lines.append(
                f"The leading digit distribution deviates significantly from Benford's Law "
                f"(deviation score: **{benford_dev:.1f}**, threshold: 15). "
                f"This pattern can indicate fabricated or manipulated transaction amounts."
            )

        # Spending patterns
        lines.append(f"\n### Spending Patterns")
        avg = df["amount"].mean()
        med = df["amount"].median()
        skew_ratio = avg / med if med > 0 else 1
        if skew_ratio > 2:
            lines.append(
                f"The data is **heavily right-skewed** (mean ${avg:,.2f} vs median ${med:,.2f}), "
                f"indicating a small number of very large transactions pulling the average up."
            )
        else:
            lines.append(
                f"Transaction amounts are relatively evenly distributed "
                f"(mean ${avg:,.2f}, median ${med:,.2f})."
            )

        if summary_data["has_date"]:
            weekend_pct = (df["date"].dt.weekday >= 5).mean() * 100
            night_pct = (df["date"].dt.hour < 6).mean() * 100
            if weekend_pct > 30 or night_pct > 15:
                lines.append(
                    f"\n**Timing note**: {weekend_pct:.0f}% of transactions occur on weekends, "
                    f"{night_pct:.0f}% during night hours (midnight–6am)."
                )

        lines.append(f"\n---\n*Report generated automatically by the Transaction Analysis Engine.*")
        return "\n".join(lines)

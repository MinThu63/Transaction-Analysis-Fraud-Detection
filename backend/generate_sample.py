"""Generate a realistic sample transactions Excel file for demo purposes."""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

np.random.seed(42)

n = 500
accounts = [f"ACC-{i:04d}" for i in range(1, 21)]
merchants = [
    "Amazon", "Walmart", "Target", "Starbucks", "Shell Gas",
    "Netflix", "Uber", "DoorDash", "Apple Store", "Best Buy",
    "Home Depot", "Costco", "Whole Foods", "CVS Pharmacy", "Unknown Vendor",
]
types = ["purchase", "transfer", "withdrawal", "deposit", "refund", "payment"]

dates = [datetime(2025, 1, 1) + timedelta(hours=np.random.randint(0, 365 * 24)) for _ in range(n)]
amounts = np.concatenate([
    np.random.lognormal(mean=3.5, sigma=1.2, size=n - 10),  # normal transactions
    np.random.uniform(8000, 25000, size=10),  # outliers
])
np.random.shuffle(amounts)

df = pd.DataFrame({
    "transaction_id": [f"TXN-{i:06d}" for i in range(1, n + 1)],
    "date": sorted(dates),
    "account_id": np.random.choice(accounts, n),
    "amount": np.round(amounts, 2),
    "type": np.random.choice(types, n, p=[0.4, 0.15, 0.15, 0.1, 0.1, 0.1]),
    "merchant": np.random.choice(merchants, n),
    "description": np.random.choice([
        "Online purchase", "In-store purchase", "ATM withdrawal",
        "Wire transfer", "Subscription", "Refund processed",
        "Bill payment", "Peer transfer", "Cash deposit",
    ], n),
})

import os
out_dir = os.path.dirname(os.path.abspath(__file__))
df.to_excel(os.path.join(out_dir, "sample_transactions.xlsx"), index=False, engine="openpyxl")
df.to_csv(os.path.join(out_dir, "sample_transactions.csv"), index=False)
print(f"Generated {n} sample transactions → sample_transactions.xlsx / .csv")

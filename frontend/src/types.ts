export interface AnalysisResult {
  summary: {
    totalTransactions: number;
    avgAmount: number;
    maxAmount: number;
    minAmount: number;
    medianAmount: number;
    stdAmount: number;
    flaggedCount: number;
    flaggedPct: number;
    rowsDropped: number;
    uniqueAccounts: number;
    uniqueMerchants: number;
    uniqueTypes: number;
  };
  riskBreakdown: Record<string, number>;
  amountDistribution: { bin: string; count: number }[];
  typeDistribution: { type: string; count: number; total: number; avg: number }[];
  topMerchants: { merchant: string; total: number; txnCount: number; avg: number }[];
  accountSummary: {
    account_id: string;
    txnCount: number;
    totalSpent: number;
    avgAmount: number;
    maxAmount: number;
    flaggedCount: number;
  }[];
  timeSeries: { date: string; count: number; total: number }[];
  hourlyDistribution: { hour: number; count: number; total: number }[];
  benfordData: { digit: number; expected: number; observed: number }[];
  benfordDeviation: number;
  flaggedTransactions: {
    account_id: string;
    amount: number;
    type: string;
    merchant: string;
    date?: string;
    fraud_score: number;
    risk_level: string;
    fraud_reasons: string;
  }[];
  merchants: string[];
  clusterData: {
    amount: number;
    zScore: number;
    cluster: number;
    riskLevel: string;
    account: string;
  }[];
  clusterSummary: {
    cluster: string;
    clusterId: number;
    count: number;
    avgAmount: number;
    avgFraudScore: number;
    riskMix: Record<string, number>;
  }[];
  accountProfiles: {
    accountId: string;
    txnCount: number;
    totalSpent: number;
    avgAmount: number;
    riskScore: number;
    riskLevel: string;
    flaggedCount: number;
    reasons: string;
    topMerchant: string;
    merchantCount: number;
  }[];
  networkNodes: { id: string; type: string; risk: string }[];
  networkLinks: { source: string; target: string; value: number; count: number }[];
  narrative: string;
}

export interface UploadResult {
  columns: string[];
  preview: Record<string, unknown>[];
  totalRows: number;
  error?: string;
}

export interface ColumnMapping {
  amountCol: string;
  accountCol: string;
  typeCol: string;
  merchantCol: string;
  dateCol: string;
}

export interface Filters {
  startDate: string;
  endDate: string;
  highAmountThreshold: number;
  rapidTxnThreshold: number;
  riskyMerchants: string[];
}

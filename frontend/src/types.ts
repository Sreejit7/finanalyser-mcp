export interface Transaction {
  id?: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  category: string;
  subcategory?: string;
  type: string;
  confidence: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface FinancialInsight {
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  description: string;
  value?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: 'savings' | 'spending' | 'budget' | 'investment';
  impact: 'high' | 'medium' | 'low';
  estimatedSavings?: number;
}

export interface Summary {
  total_transactions: number;
  total_income: number;
  total_expenses: number;
  categories: string[];
  high_confidence_count: number;
  low_confidence_count: number;
}

export interface AnalysisResponse {
  transactions: Transaction[];
  insights: any;
  summary: Summary;
}
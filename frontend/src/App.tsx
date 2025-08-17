import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { TransactionTable } from './components/TransactionTable';
import { InsightsPanel } from './components/InsightsPanel';
import { SuggestionsPanel } from './components/SuggestionsPanel';
// import { parseExcelFile } from './utils/transactionParser';
// import { categorizeTransactions, generateInsights, getCategorySpending, generateSuggestions } from './utils/aiAnalyzer';
import { Transaction, FinancialInsight, CategorySpending, Suggestion, AnalysisResponse } from './types';
import { formatCurrency, formatCurrencyWithSign } from './utils/currency';
import { BarChart3, Brain, TrendingUp, Shield, Sparkles, Zap, Target } from 'lucide-react';
import './animations.css';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'insights' | 'suggestions'>('overview');
  const [streamingProgress, setStreamingProgress] = useState<{
    percentage: number;
    currentBatch: number;
    totalBatches: number;
    processedCount: number;
  } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // File validation function
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.json'];
    
    // Check file size
    if (file.size > maxSize) {
      return 'File size too large. Please upload a file smaller than 10MB.';
    }
    
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return `Unsupported file type. Please upload a ${allowedTypes.join(', ')} file.`;
    }
    
    // Check if file is empty
    if (file.size === 0) {
      return 'File appears to be empty. Please upload a valid financial data file.';
    }
    
    return null; // No validation errors
  };

  // Enhanced error message formatting
  const formatErrorMessage = (error: string): string => {
    switch (true) {
      case error.includes('404'):
        return 'Analysis service is currently unavailable. Please try again later.';
      case error.includes('413'):
        return 'File too large for processing. Please try with a smaller file.';
      case error.includes('400'):
        return 'Invalid file format. Please ensure your file contains valid financial data.';
      case error.includes('500'):
        return 'Server error occurred. Our team has been notified. Please try again.';
      case error.includes('network') || error.includes('fetch'):
        return 'Network connection issue. Please check your internet and try again.';
      default:
        return error;
    }
  };

  // Retry function for failed uploads
  const handleRetry = () => {
    if (lastUploadedFile) {
      handleFileSelect(lastUploadedFile);
    }
  };

  const handleFileSelect = async (file: File) => {
    // Store the file for retry functionality
    setLastUploadedFile(file);
    
    // Validate file before processing
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check if EventSource is supported, fallback to regular API if not
    if (!window.EventSource) {
      console.log('EventSource not supported, falling back to regular API');
      return handleFileSelectFallback(file);
    }

    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    setStreamingProgress(null);
    
    // Reset all state for new analysis
    setTransactions([]);
    setInsights([]);
    setCategorySpending([]);
    setSuggestions([]);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Since EventSource only supports GET, we need to handle this differently
      // We'll use fetch with a streaming response instead
      
      const response = await fetch('/api/analyze/stream', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      // Read the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      let allTransactions: Transaction[] = [];
      
      try {
        while (true) {
          const { value, done } = await reader.read();
          
          if (done) {
            console.log('🎉 Stream finished');
            setIsLoading(false);
            setIsStreaming(false);
            setStreamingProgress(null);
            break;
          }
          
          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('event: ')) {
              const eventType = line.substring(7);
              continue;
            }
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));
                
                // Handle different event types based on the data structure
                if (data.total_transactions && !data.batch_number) {
                  // analysis_started event
                  console.log(`📊 Analysis started: ${data.total_transactions} transactions to process`);
                } else if (data.batch_number) {
                  // batch_complete event
                  console.log(`✅ Batch ${data.batch_number}/${data.total_batches} complete (${data.progress_percentage.toFixed(1)}%)`);
                  
                  // Update progress
                  setStreamingProgress({
                    percentage: data.progress_percentage,
                    currentBatch: data.batch_number,
                    totalBatches: data.total_batches,
                    processedCount: data.total_processed
                  });
                  
                  // Add new transactions to the list
                  if (data.new_transactions) {
                    allTransactions = [...allTransactions, ...data.new_transactions];
                    setTransactions([...allTransactions]);
                  }
                  
                  // Update insights incrementally
                  if (data.insights) {
                    updateInsightsFromStreaming(data.insights);
                  }
                  
                  // Update category spending incrementally
                  updateCategorySpendingFromTransactions(allTransactions);
                  
                  // Show the data immediately if this is the first batch
                  if (data.batch_number === 1) {
                    setActiveTab('overview');
                  }
                } else if (data.suggestions) {
                  // suggestions_generated event
                  setSuggestions(data.suggestions);
                } else if (data.message) {
                  // analysis_complete event
                  console.log('🎉 Analysis completed!');
                  
                } else if (data.error) {
                  // error event
                  console.error('❌ Streaming error:', data.error);
                  const formattedError = formatErrorMessage(data.error);
                  setError(`Analysis error: ${formattedError}`);
                  
                  // Stop streaming on error
                  setIsStreaming(false);
                  setStreamingProgress(null);
                }
              } catch (parseError) {
                console.error('❌ Failed to parse SSE data:', parseError, 'Raw line:', line);
                // Continue processing other messages instead of failing completely
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
    } catch (err) {
      console.error('❌ Streaming setup error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while setting up streaming';
      const formattedError = formatErrorMessage(errorMessage);
      
      setError(`Streaming failed: ${formattedError}. Attempting fallback...`);
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingProgress(null);
      
      // Auto-retry with fallback after a brief delay
      setTimeout(() => {
        setError(null);
        handleFileSelectFallback(file);
      }, 2000);
    }
  };

  // Fallback function for non-streaming analysis
  const handleFileSelectFallback = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Upload failed (${response.status}): ${errorText}`);
      }
      
      const analysisData: AnalysisResponse = await response.json();
      
      // Update state with API response data (original logic)
      setTransactions(analysisData.transactions);
      
      if (analysisData.insights) {
        updateInsightsFromStreaming(analysisData.insights);
      }
      
      updateCategorySpendingFromTransactions(analysisData.transactions);
      
      // Use suggestions from API if available, otherwise generate fallback
      if (analysisData.suggestions) {
        setSuggestions(analysisData.suggestions);
      }
      
      setActiveTab('overview');
    } catch (err) {
      console.error('❌ Fallback analysis error:', err);
      
      let errorMessage = 'An error occurred while processing the file';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try with a smaller file or check your connection.';
        } else {
          errorMessage = err.message;
        }
      }
      
      const formattedError = formatErrorMessage(errorMessage);
      setError(formattedError);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to update insights from streaming data
  const updateInsightsFromStreaming = (insightsData: any) => {
    const convertedInsights: FinancialInsight[] = [];
    
    if (insightsData.summary) {
      const summary = insightsData.summary;
      convertedInsights.push({
        type: 'info',
        title: 'Total Transactions',
        description: `${summary.total_transactions} transactions processed`,
        value: summary.total_transactions
      });
      
      if (summary.total_income > 0) {
        convertedInsights.push({
          type: 'success',
          title: 'Total Income',
          description: formatCurrency(summary.total_income),
          value: summary.total_income
        });
      }
      
      if (summary.total_expenses > 0) {
        convertedInsights.push({
          type: 'warning',
          title: 'Total Expenses',
          description: formatCurrency(summary.total_expenses),
          value: summary.total_expenses
        });
      }
      
      convertedInsights.push({
        type: summary.net_cash_flow >= 0 ? 'success' : 'alert',
        title: 'Net Cash Flow',
        description: formatCurrencyWithSign(summary.net_cash_flow),
        value: summary.net_cash_flow
      });
      
      convertedInsights.push({
        type: 'info',
        title: 'Categorization Confidence',
        description: `${(summary.categorization_confidence * 100).toFixed(1)}% average confidence`,
        value: summary.categorization_confidence
      });
    }
    
    // Add top expenses insights
    if (insightsData.top_expenses?.length > 0) {
      insightsData.top_expenses.slice(0, 3).forEach((expense: any, index: number) => {
        convertedInsights.push({
          type: 'warning',
          title: `Top Expense #${index + 1}`,
          description: `${expense.description}: ${formatCurrency(expense.amount)}`,
          value: expense.amount
        });
      });
    }
    
    setInsights(convertedInsights);
  };

  // Helper function to update category spending from transactions
  const updateCategorySpendingFromTransactions = (transactions: Transaction[]) => {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    // Filter to only include expense transactions
    const expenseTransactions = transactions.filter(transaction => transaction.type === 'expense');
    expenseTransactions.forEach(transaction => {
      const existing = categoryMap.get(transaction.category) || { amount: 0, count: 0 };
      categoryMap.set(transaction.category, {
        amount: existing.amount + Math.abs(transaction.amount),
        count: existing.count + 1
      });
    });
    
    const totalAmount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);
    const categorySpendingData: CategorySpending[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      trend: 'stable' as const
    }));
    
    setCategorySpending(categorySpendingData);
  };

  // Suggestion handlers
  const handleLearnMore = (suggestion: Suggestion) => {
    // Navigate to relevant sections based on suggestion category
    if (suggestion.category === 'budget') {
      setActiveTab('transactions');
    } else if (suggestion.category === 'spending') {
      setActiveTab('insights');
    } else if (suggestion.category === 'savings' || suggestion.category === 'investment') {
      setActiveTab('insights');
    } else {
      // Default to insights for detailed analysis
      setActiveTab('insights');
    }
  };

  const handleRemindLater = (suggestion: Suggestion) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestion.id]));
  };

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id));

  const hasData = transactions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>
      
      {/* Header */}
      <header className="relative z-10 backdrop-blur-sm bg-white/10 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="relative p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <Brain className="h-6 w-6 text-white" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">BankSense AI</h1>
                <p className="text-sm text-purple-200">Intelligent Financial Analysis</p>
              </div>
            </div>
            
            {hasData && (
              <div className="flex items-center space-x-2 bg-green-500/20 backdrop-blur-sm px-4 py-2 rounded-full border border-green-400/30 hover:bg-green-500/30 transition-all duration-300">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-300">
                  {transactions.length} transactions processed
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasData ? (
          // Upload Section
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
              Transform Your Financial Data with AI
            </h2>
            <p className="text-lg text-purple-200 mb-12 max-w-2xl mx-auto leading-relaxed">
              Upload your bank statement and get instant AI-powered insights, intelligent categorization, 
              and personalized financial recommendations to optimize your spending.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
              <div className="group text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-white mb-3 text-lg">Smart Categorization</h3>
                <p className="text-sm text-purple-200 leading-relaxed">AI automatically categorizes transactions with high accuracy</p>
              </div>
              
              <div className="group text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-white mb-3 text-lg">Deep Insights</h3>
                <p className="text-sm text-purple-200 leading-relaxed">Get detailed analysis of spending patterns and trends</p>
              </div>
              
              <div className="group text-center p-8 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105 hover:shadow-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:rotate-12 transition-transform duration-300">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-white mb-3 text-lg">Smart Suggestions</h3>
                <p className="text-sm text-purple-200 leading-relaxed">Receive personalized recommendations to improve finances</p>
              </div>
            </div>
            
            <FileUpload 
              onFileSelect={handleFileSelect} 
              isLoading={isLoading} 
              error={error}
              streamingProgress={streamingProgress}
              isStreaming={isStreaming}
              onRetry={error ? handleRetry : undefined}
            />
          </div>
        ) : (
          // Analysis Dashboard
          <>
            {/* Navigation Tabs */}
            <div className="mb-8">
              <nav className="flex space-x-2 bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-white/20">
                {[
                  { id: 'overview', label: 'Overview', icon: Sparkles },
                  { id: 'transactions', label: 'Transactions', icon: BarChart3 },
                  { id: 'insights', label: 'Insights', icon: Zap },
                  { id: 'suggestions', label: 'Suggestions', icon: Target },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                        : 'text-purple-200 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    {tab.icon && <tab.icon className="h-4 w-4" />}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-8">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <InsightsPanel insights={insights} categorySpending={categorySpending} />
                  </div>
                  <div>
                    <SuggestionsPanel 
                      suggestions={visibleSuggestions.slice(0, 3)} 
                      onLearnMore={handleLearnMore}
                      onRemindLater={handleRemindLater}
                    />
                  </div>
                </div>
              )}
              
              {activeTab === 'transactions' && (
                <TransactionTable transactions={transactions} />
              )}
              
              {activeTab === 'insights' && (
                <InsightsPanel insights={insights} categorySpending={categorySpending} />
              )}
              
              {activeTab === 'suggestions' && (
                <SuggestionsPanel 
                  suggestions={visibleSuggestions} 
                  onLearnMore={handleLearnMore}
                  onRemindLater={handleRemindLater}
                />
              )}
            </div>

            {/* Upload New File Button */}
            <div className="mt-12 text-center">
              <button
                onClick={() => {
                  setTransactions([]);
                  setInsights([]);
                  setCategorySpending([]);
                  setSuggestions([]);
                  setError(null);
                }}
                className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <span className="flex items-center space-x-2">
                  <span>Upload New Statement</span>
                  <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform duration-300" />
                </span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-16 bg-white/5 backdrop-blur-sm border-t border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-purple-200 text-sm">
              All processing is done locally in your browser. Your financial data never leaves your device.
            </p>
            <div className="mt-4 flex items-center justify-center space-x-4 text-xs text-purple-300">
              <span>🔒 Bank-level security</span>
              <span>•</span>
              <span>🤖 AI-powered analysis</span>
              <span>•</span>
              <span>📱 Mobile responsive</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
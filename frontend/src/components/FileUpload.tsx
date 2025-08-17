import React, { useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  error: string | null;
  streamingProgress?: {
    percentage: number;
    currentBatch: number;
    totalBatches: number;
    processedCount: number;
  } | null;
  isStreaming?: boolean;
  onRetry?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  isLoading, 
  error, 
  streamingProgress, 
  isStreaming,
  onRetry 
}) => {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => 
      file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')
    );
    
    if (excelFile) {
      onFileSelect(excelFile);
    }
  }, [onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="group relative border-2 border-dashed border-purple-400/50 rounded-3xl p-12 text-center hover:border-purple-400 transition-all duration-500 bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:scale-105"
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
          aria-label="Upload file"
        />
        
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="p-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
              {isLoading ? (
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
              ) : (
                <Upload className="h-10 w-10 text-white" />
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {isLoading ? 'Processing your bank statement...' : 'Upload your bank statement'}
            </h3>
            {!isLoading && (
              <p className="text-purple-200 mb-6 text-lg">
                Drag and drop your Excel file here, or click to browse
              </p>
            )}
            
            {/* Streaming Progress Display */}
            {isStreaming && streamingProgress && (
              <div className="mb-6 space-y-4 fade-in">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 transform transition-all duration-500 hover:bg-white/15 hover-glow">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-white">
                      Processing Batch {streamingProgress.currentBatch} of {streamingProgress.totalBatches}
                    </span>
                    <span className="text-sm text-purple-200 transition-all duration-300">
                      <span className="font-mono count-up animate-number">{streamingProgress.processedCount}</span> transactions processed
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-white/20 rounded-full h-3 mb-3 overflow-hidden">
                    <div 
                      className="h-3 rounded-full progress-bar progress-glow"
                      style={{ 
                        width: `${Math.min(streamingProgress.percentage, 100)}%`
                      }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-purple-300">
                      {streamingProgress.percentage.toFixed(1)}% Complete
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
                      </div>
                      <span className="text-xs text-green-300 font-medium animate-pulse">Live Analysis</span>
                    </div>
                  </div>
                </div>
                
                {/* Status Messages */}
                <div className="text-center">
                  <p className="text-sm text-purple-200">
                    AI is categorizing your transactions in real-time...
                  </p>
                  <p className="text-xs text-purple-300 mt-1">
                    Results will appear automatically as they're processed
                  </p>
                </div>
              </div>
            )}
            
            {/* Regular Loading State */}
            {isLoading && !isStreaming && (
              <div className="mb-6">
                <p className="text-purple-200 text-lg mb-4">
                  Analyzing your financial data...
                </p>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-6 text-sm text-purple-300">
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-lg">
                <FileText className="h-4 w-4 text-green-400" />
                <span>.xlsx</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-lg">
                <FileText className="h-4 w-4 text-blue-400" />
                <span>.xls</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-lg">
                <FileText className="h-4 w-4 text-purple-400" />
                <span>.csv</span>
              </div>
            </div>
          </div>
          
          {!isLoading && (
            <button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl">
              Choose File
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mt-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl fade-in shake">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <p className="text-red-200 text-sm mb-3 slide-in-from-left">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="bg-red-500/30 hover:bg-red-500/50 text-red-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 slide-in-from-bottom"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8 text-xs text-purple-300 text-center space-y-1">
        <p>Your data is processed locally and never sent to external servers.</p>
        <p>We support most bank statement formats from major banks.</p>
      </div>
    </div>
  );
};
import React from 'react';

export const LoadingSection: React.FC = () => {
  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-16 shadow-2xl border border-white/20 text-center animate-fade-in-up">
      <div className="relative w-24 h-24 mx-auto mb-8">
        {/* Outer spinning ring */}
        <div className="absolute inset-0 border-4 border-purple-200 rounded-full animate-spin">
          <div className="w-full h-full border-t-4 border-purple-600 rounded-full"></div>
        </div>
        
        {/* Inner pulsing circle */}
        <div className="absolute inset-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full animate-pulse flex items-center justify-center">
          <svg className="w-8 h-8 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>

      <h3 className="text-3xl font-bold text-gray-800 mb-4">
        Analyzing Your Financial Data
      </h3>
      
      <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
        Our advanced AI is processing your transactions, identifying patterns, and generating intelligent insights. 
        This usually takes 30-60 seconds.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h4 className="font-bold text-blue-800 mb-2">Parsing Transactions</h4>
          <p className="text-sm text-blue-600">
            Reading and structuring your financial data
          </p>
        </div>

        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h4 className="font-bold text-purple-800 mb-2">AI Categorization</h4>
          <p className="text-sm text-purple-600">
            Intelligent classification using machine learning
          </p>
        </div>

        <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h4 className="font-bold text-emerald-800 mb-2">Generating Insights</h4>
          <p className="text-sm text-emerald-600">
            Creating comprehensive financial analysis
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <span className="ml-2">Processing...</span>
        </div>
      </div>
    </div>
  );
};
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center mb-12 animate-fade-in-down">
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-pink-400 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-12 hover:rotate-0 transition-transform duration-300">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-white drop-shadow-2xl bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
          FinAnalyzer
        </h1>
      </div>
      <p className="text-xl text-white/90 font-light max-w-2xl mx-auto leading-relaxed">
        Transform your financial data into intelligent insights with our cutting-edge AI-powered analysis platform
      </p>
      <div className="flex items-center justify-center gap-6 mt-6">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white/80 text-sm">AI Powered</span>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-white/80 text-sm">Real-time Analysis</span>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
          <span className="text-white/80 text-sm">Secure & Private</span>
        </div>
      </div>
    </header>
  );
};
import React from 'react';
import { Suggestion } from '../types';
import { formatCurrency } from '../utils/currency';
import { Lightbulb, TrendingUp, DollarSign, Shield, Banknote, Target } from 'lucide-react';

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
}

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({ suggestions }) => {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'savings':
        return <DollarSign className="h-5 w-5" />;
      case 'investment':
        return <TrendingUp className="h-5 w-5" />;
      case 'budget':
        return <Target className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'savings':
        return 'bg-green-500/20 text-green-300 border-green-400/30';
      case 'investment':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/30';
      case 'budget':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-300 bg-red-500/20 border border-red-400/30';
      case 'medium':
        return 'text-yellow-300 bg-yellow-500/20 border border-yellow-400/30';
      case 'low':
        return 'text-green-300 bg-green-500/20 border border-green-400/30';
      default:
        return 'text-gray-300 bg-gray-500/20 border border-gray-400/30';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
      <div className="flex items-center space-x-2 mb-6">
        <Lightbulb className="h-6 w-6 text-purple-400" />
        <h2 className="text-2xl font-bold text-white">AI-Powered Suggestions</h2>
      </div>
      
      <div className="space-y-6">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="border border-white/20 rounded-xl p-6 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl border backdrop-blur-sm ${getCategoryColor(suggestion.category)}`}>
                  {getCategoryIcon(suggestion.category)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {suggestion.title}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize backdrop-blur-sm ${getImpactColor(suggestion.impact)}`}>
                      {suggestion.impact} Impact
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize backdrop-blur-sm ${getCategoryColor(suggestion.category)}`}>
                      {suggestion.category}
                    </span>
                  </div>
                </div>
              </div>
              
              {suggestion.estimatedSavings && (
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-green-600">
                    <Banknote className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">Potential Savings</span>
                  </div>
                  <p className="text-xl font-bold text-green-400">
                    {formatCurrency(suggestion.estimatedSavings)}
                  </p>
                  <p className="text-xs text-purple-300">per month</p>
                </div>
              )}
            </div>
            
            <p className="text-purple-200 leading-relaxed mb-4">
              {suggestion.description}
            </p>
            
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-300 text-sm font-medium hover:scale-105">
                Learn More
              </button>
              <button className="px-4 py-2 bg-white/10 text-purple-200 rounded-lg hover:bg-white/20 transition-all duration-300 text-sm font-medium hover:scale-105">
                Remind Me Later
              </button>
            </div>
          </div>
        ))}
        
        {suggestions.length === 0 && (
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <p className="text-purple-200 text-lg">No suggestions available yet.</p>
            <p className="text-purple-300 text-sm">Upload more transaction data to get personalized recommendations.</p>
          </div>
        )}
      </div>
    </div>
  );
};
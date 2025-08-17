import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  gradient: string;
  bgGradient: string;
  isPositive?: boolean;
  isNegative?: boolean;
}

const iconPaths: { [key: string]: string } = {
  'list': 'M4 6h16M4 10h16M4 14h16M4 18h16',
  'trending-up': 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  'trending-down': 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  gradient,
  bgGradient,
  isPositive,
  isNegative,
}) => {
  return (
    <div className={`bg-gradient-to-br ${bgGradient} rounded-3xl p-6 border border-white/30 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl`}>
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 bg-gradient-to-r ${gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPaths[icon]} />
          </svg>
        </div>
        <div className="flex-1">
          <div className={`text-3xl font-bold mb-1 ${
            isPositive ? 'text-emerald-700' : 
            isNegative ? 'text-red-700' : 
            'text-gray-800'
          }`}>
            {value}
          </div>
          <div className="text-gray-600 font-medium text-sm">
            {title}
          </div>
        </div>
      </div>
      
      {(isPositive || isNegative) && (
        <div className="mt-4 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isPositive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'
          }`}></div>
          <span className={`text-xs font-medium ${
            isPositive ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {isPositive ? 'Positive cash flow' : 'Net outflow'}
          </span>
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { FinancialInsight, CategorySpending } from '../types';
import { formatCurrency } from '../utils/currency';
import { TrendingUp, TrendingDown, DollarSign, PieChart, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Pie } from 'recharts';

interface InsightsPanelProps {
  insights: FinancialInsight[];
  categorySpending: CategorySpending[];
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights, categorySpending }) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getInsightBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-400/30 bg-green-500/20';
      case 'warning':
        return 'border-yellow-400/30 bg-yellow-500/20';
      case 'alert':
        return 'border-red-400/30 bg-red-500/20';
      default:
        return 'border-blue-400/30 bg-blue-500/20';
    }
  };

  const pieChartData = categorySpending.slice(0, 6).map((cat, index) => ({
    name: cat.category,
    value: cat.amount,
    percentage: cat.percentage
  }));

  const COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#F97316'];

  return (
    <div className="space-y-8">
      {/* Key Insights */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
        <div className="flex items-center space-x-2 mb-6">
          <DollarSign className="h-6 w-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Financial Insights</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-5 border rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 ${getInsightBorderColor(insight.type)}`}
            >
              <div className="flex items-start space-x-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm mb-2">
                    {insight.title}
                  </h3>
                  <p className="text-sm text-purple-200 leading-relaxed">
                    {insight.description}
                  </p>
                  {insight.value !== undefined && !insight.title.includes('Confidence') && !insight.title.includes('Transactions') && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-lg font-bold text-white">
                        {insight.title.includes('Rate') ? 
                          `${insight.value.toFixed(1)}%` : 
                          formatCurrency(insight.value)
                        }
                      </span>
                      {insight.trend && (
                        <div className={`flex items-center ${
                          insight.trend === 'up' ? 'text-green-500' : 
                          insight.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {insight.trend === 'up' ? 
                            <TrendingUp className="h-4 w-4" /> : 
                            <TrendingDown className="h-4 w-4" />
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
        <div className="flex items-center space-x-2 mb-6">
          <PieChart className="h-6 w-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Spending by Category</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <defs>
                  <style>
                    {`.recharts-pie-label-text { fill: white !important; font-weight: bold; font-size: 14px; }`}
                  </style>
                </defs>
                <Pie
                  dataKey="value"
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                  labelLine={false}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Amount']}
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  labelStyle={{ color: 'white' }}
                  itemStyle={{ color: 'white' }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Category List */}
          <div className="space-y-3">
            {categorySpending.slice(0, 8).map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full shadow-lg"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <div>
                    <p className="font-medium text-white">{category.category}</p>
                    <p className="text-sm text-purple-300">{category.count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">
                    {formatCurrency(category.amount)}
                  </p>
                  <p className="text-sm text-purple-300">
                    {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spending Bar Chart */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
        <h2 className="text-2xl font-bold text-white mb-6">Category Comparison</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categorySpending.slice(0, 8)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
              <XAxis 
                dataKey="category" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fill: 'white', fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={(value) => `₹${value}`}
                tick={{ fill: 'white', fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Amount']}
                labelFormatter={(label) => `Category: ${label}`}
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
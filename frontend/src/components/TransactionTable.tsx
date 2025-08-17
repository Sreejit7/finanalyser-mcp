import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatCurrencyWithSign } from '../utils/currency';
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionTableProps {
  transactions: Transaction[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = Array.from(new Set(transactions.map(t => t.category)));

  const handleSort = (field: 'date' | 'amount' | 'category') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredTransactions = transactions
    .filter(transaction => {
      const matchesCategory = filterCategory === 'all' || transaction.category === filterCategory;
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = Math.abs(a.amount) - Math.abs(b.amount);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const SortIcon = ({ field }: { field: 'date' | 'amount' | 'category' }) => {
    if (sortBy !== field) return <ChevronDown className="h-4 w-4 text-gray-400" />;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4 text-blue-600" /> : 
      <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden hover:bg-white/20 transition-all duration-300">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h2 className="text-2xl font-bold text-white">Transaction Details</h2>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-300" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-purple-300" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="pl-10 pr-8 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none transition-all duration-300"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-white cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  <SortIcon field="date" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">Description</th>
              <th 
                className="px-6 py-4 text-left text-sm font-semibold text-white cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center space-x-1">
                  <span>Category</span>
                  <SortIcon field="category" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-right text-sm font-semibold text-white cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Amount</span>
                  <SortIcon field="amount" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredTransactions.map((transaction, index) => (
              <tr key={transaction.id || index} className="hover:bg-white/10 transition-colors">
                <td className="px-6 py-4 text-sm text-white">
                  {format(new Date(transaction.date), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-white font-medium">
                    {transaction.description}
                  </div>
                  {transaction.confidence > 0 && (
                    <div className="text-xs text-purple-300 mt-1">
                      AI Confidence: {(transaction.confidence * 100).toFixed(1)}%
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                    getCategoryColor(transaction.category)
                  }`}>
                    {transaction.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <span className={`font-semibold ${
                    transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrencyWithSign(transaction.amount, transaction.type)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-white/5 border-t border-white/10">
        <p className="text-sm text-purple-200">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </p>
      </div>
    </div>
  );
};

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Food & Dining': 'bg-orange-500/20 text-orange-300 border border-orange-400/30',
    'Shopping': 'bg-purple-500/20 text-purple-300 border border-purple-400/30',
    'Transportation': 'bg-blue-500/20 text-blue-300 border border-blue-400/30',
    'Bills & Utilities': 'bg-gray-500/20 text-gray-300 border border-gray-400/30',
    'Healthcare': 'bg-red-500/20 text-red-300 border border-red-400/30',
    'Entertainment': 'bg-pink-500/20 text-pink-300 border border-pink-400/30',
    'Income': 'bg-green-500/20 text-green-300 border border-green-400/30',
    'Banking': 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30',
    'Investment': 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30',
    'Insurance': 'bg-teal-500/20 text-teal-300 border border-teal-400/30',
    'Education': 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30',
    'Personal Care': 'bg-rose-500/20 text-rose-300 border border-rose-400/30',
    'Other': 'bg-gray-500/20 text-gray-300 border border-gray-400/30',
  };
  
  return colors[category] || 'bg-gray-500/20 text-gray-300 border border-gray-400/30';
};
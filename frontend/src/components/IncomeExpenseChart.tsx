import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Summary } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface IncomeExpenseChartProps {
  summary: Summary;
}

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({ summary }) => {
  const data = {
    labels: ['Income', 'Expenses'],
    datasets: [
      {
        label: 'Amount ($)',
        data: [summary.total_income, summary.total_expenses],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Emerald for income
          'rgba(239, 68, 68, 0.8)',  // Red for expenses
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 3,
        borderRadius: 15,
        borderSkipped: false,
        barThickness: 80,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1,
        cornerRadius: 12,
        callbacks: {
          label: function(context: any) {
            return `${context.label}: $${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 14,
            weight: '600',
          },
          color: '#374151',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1,
        },
        ticks: {
          font: {
            size: 12,
          },
          color: '#6B7280',
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart' as const,
    },
  };

  const netBalance = summary.total_income - summary.total_expenses;

  return (
    <div className="space-y-6">
      <div className="relative h-64">
        <Bar data={data} options={options} />
      </div>
      
      {/* Net Balance Display */}
      <div className={`p-6 rounded-2xl text-center ${
        netBalance >= 0 
          ? 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200' 
          : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'
      }`}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className={`w-3 h-3 rounded-full ${
            netBalance >= 0 ? 'bg-emerald-500' : 'bg-red-500'
          } animate-pulse`}></div>
          <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            Net Balance
          </span>
        </div>
        <div className={`text-3xl font-bold ${
          netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'
        }`}>
          {netBalance >= 0 ? '+' : ''}${netBalance.toLocaleString()}
        </div>
        <div className={`text-sm mt-1 ${
          netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {netBalance >= 0 ? 'Positive cash flow' : 'Spending exceeds income'}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200">
          <div className="text-sm text-blue-600 font-medium mb-1">Savings Rate</div>
          <div className="text-xl font-bold text-blue-800">
            {summary.total_income > 0 ? Math.round((netBalance / summary.total_income) * 100) : 0}%
          </div>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl border border-purple-200">
          <div className="text-sm text-purple-600 font-medium mb-1">Expense Ratio</div>
          <div className="text-xl font-bold text-purple-800">
            {summary.total_income > 0 ? Math.round((summary.total_expenses / summary.total_income) * 100) : 0}%
          </div>
        </div>
      </div>
    </div>
  );
};
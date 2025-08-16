// import React from 'react';
// import { AnalysisResults } from '../types';
// import { StatCard } from './StatCard';
// import { CategoryChart } from './CategoryChart';
// import { IncomeExpenseChart } from './IncomeExpenseChart';
// import { TransactionsTable } from './TransactionTable';

// interface ResultsSectionProps {
//   results: AnalysisResults;
//   onReset: () => void;
// }

// export const ResultsSection: React.FC<ResultsSectionProps> = ({ results, onReset }) => {
//   const { summary } = results;
//   const netBalance = summary.total_income - summary.total_expenses;

//   return (
//     <div className="animate-fade-in-up space-y-8">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/20">
//         <div>
//           <h1 className="text-4xl font-bold text-gray-800 mb-2">
//             Analysis Complete
//           </h1>
//           <p className="text-gray-600">
//             Your financial data has been processed and categorized with AI precision
//           </p>
//         </div>
//         <button
//           onClick={onReset}
//           className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
//         >
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
//           </svg>
//           New Analysis
//         </button>
//       </div>

//       {/* Summary Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <StatCard
//           title="Total Transactions"
//           value={summary.total_transactions.toLocaleString()}
//           icon="list"
//           gradient="from-blue-500 to-cyan-500"
//           bgGradient="from-blue-50 to-cyan-50"
//         />
//         <StatCard
//           title="Total Income"
//           value={`$${summary.total_income.toLocaleString()}`}
//           icon="trending-up"
//           gradient="from-emerald-500 to-green-500"
//           bgGradient="from-emerald-50 to-green-50"
//           isPositive
//         />
//         <StatCard
//           title="Total Expenses"
//           value={`$${summary.total_expenses.toLocaleString()}`}
//           icon="trending-down"
//           gradient="from-red-500 to-pink-500"
//           bgGradient="from-red-50 to-pink-50"
//           isNegative
//         />
//         <StatCard
//           title="Net Balance"
//           value={`${netBalance >= 0 ? '+' : ''}$${netBalance.toLocaleString()}`}
//           icon={netBalance >= 0 ? 'trending-up' : 'trending-down'}
//           gradient={netBalance >= 0 ? 'from-emerald-500 to-green-500' : 'from-red-500 to-pink-500'}
//           bgGradient={netBalance >= 0 ? 'from-emerald-50 to-green-50' : 'from-red-50 to-pink-50'}
//           isPositive={netBalance >= 0}
//           isNegative={netBalance < 0}
//         />
//       </div>

//       {/* Charts Section */}
//       <div className="grid lg:grid-cols-2 gap-8">
//         <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
//           <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
//             Spending by Category
//           </h3>
//           <CategoryChart transactions={results.transactions} />
//         </div>
        
//         <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
//           <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
//             Income vs Expenses
//           </h3>
//           <IncomeExpenseChart summary={summary} />
//         </div>
//       </div>

//       {/* Confidence Metrics */}
//       <div className="grid md:grid-cols-2 gap-6">
//         <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-3xl p-8 border border-emerald-200">
//           <div className="flex items-center gap-4 mb-4">
//             <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//             <div>
//               <h3 className="text-2xl font-bold text-emerald-800">
//                 {summary.high_confidence_count}
//               </h3>
//               <p className="text-emerald-600 font-medium">High Confidence Transactions</p>
//             </div>
//           </div>
//           <p className="text-emerald-700">
//             These transactions were categorized with over 80% confidence by our AI model.
//           </p>
//         </div>

//         <div className="bg-gradient-to-br from-orange-50 to-red-100 rounded-3xl p-8 border border-orange-200">
//           <div className="flex items-center gap-4 mb-4">
//             <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center">
//               <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
//               </svg>
//             </div>
//             <div>
//               <h3 className="text-2xl font-bold text-orange-800">
//                 {summary.low_confidence_count}
//               </h3>
//               <p className="text-orange-600 font-medium">Need Manual Review</p>
//             </div>
//           </div>
//           <p className="text-orange-700">
//             These transactions have lower confidence scores and may need manual verification.
//           </p>
//         </div>
//       </div>

//       {/* Transactions Table */}
//       <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
//         <div className="p-8 border-b border-gray-200">
//           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//             <h3 className="text-2xl font-bold text-gray-800">
//               Transaction Details
//             </h3>
//             <div className="flex items-center gap-4 text-sm text-gray-600">
//               <div className="flex items-center gap-2">
//                 <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
//                 <span>{summary.high_confidence_count} high confidence</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
//                 <span>{summary.low_confidence_count} need review</span>
//               </div>
//             </div>
//           </div>
//         </div>
        
//         <TransactionsTable transactions={results.transactions} />
//       </div>
//     </div>
//   );
// };
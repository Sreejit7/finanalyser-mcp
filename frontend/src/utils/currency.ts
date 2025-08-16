export const formatCurrency = (amount: number): string => {
  return `₹${Math.abs(amount).toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

export const formatCurrencyWithSign = (amount: number, type?: string): string => {
  const formattedAmount = formatCurrency(amount);
  if (type === 'income' || amount > 0) {
    return `+${formattedAmount}`;
  } else {
    return `-${formattedAmount}`;
  }
};
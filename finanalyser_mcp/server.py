#!/usr/bin/env python3

import asyncio
import json
import csv
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import logging

import openai
from mcp.server import Server
from mcp.server.models import InitializationOptions, ServerCapabilities
from mcp.server.lowlevel.server import NotificationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    Resource,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    LoggingLevel
)
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Transaction:
    date: str
    description: str
    amount: float
    category: Optional[str] = None
    type: Optional[str] = None  # 'income' or 'expense'
    confidence: Optional[float] = None

class FinancialAnalyzer:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None):
        self.openai_client = None
        
        # Load defaults from environment variables
        default_model = os.getenv("DEFAULT_MODEL", "google/gemini-flash-1.5")
        default_base_url = os.getenv("BASE_URL", "https://openrouter.ai/api/v1")
        
        self.model = model or default_model
        self.base_url = base_url or default_base_url
        
        logger.info(f"FinancialAnalyzer initialization:")
        logger.info(f"  - api_key provided: {'Yes' if api_key else 'No'}")
        logger.info(f"  - base_url: {self.base_url} {'(from env)' if base_url is None and os.getenv('BASE_URL') else '(default)' if base_url is None else '(provided)'}")
        logger.info(f"  - model: {self.model} {'(from env)' if model is None and os.getenv('DEFAULT_MODEL') else '(default)' if model is None else '(provided)'}")
        logger.info(f"  - OPENROUTER_API_KEY env: {'Set' if os.getenv('OPENROUTER_API_KEY') else 'Not set'}")
        logger.info(f"  - OPENAI_API_KEY env: {'Set' if os.getenv('OPENAI_API_KEY') else 'Not set'}")
        logger.info(f"  - DEFAULT_MODEL env: {'Set' if os.getenv('DEFAULT_MODEL') else 'Not set'}")
        logger.info(f"  - BASE_URL env: {'Set' if os.getenv('BASE_URL') else 'Not set'}")

        # Try to initialize client with provided parameters
        if api_key:
            logger.info("Using provided API key")
            # If API key provided, always use OpenRouter unless explicitly told otherwise
            if not base_url:
                logger.info("No base_url specified, using OpenRouter by default")
            self._initialize_client(api_key, self.base_url)
        elif os.getenv("OPENROUTER_API_KEY"):
            logger.info("Using OPENROUTER_API_KEY from environment")
            self._initialize_client(os.getenv("OPENROUTER_API_KEY"), self.base_url)
        elif os.getenv("OPENAI_API_KEY"):
            # Only fallback to OpenAI if no OpenRouter key available and no base_url specified
            logger.info("No OpenRouter key found, falling back to OpenAI API")
            self._initialize_client(os.getenv("OPENAI_API_KEY"), "https://api.openai.com/v1")
            self.model = "gpt-4o-mini"
        else:
            logger.warning("No API key provided. LLM categorization will be disabled.")

    def _initialize_client(self, api_key: str, base_url: str):
        """Initialize the OpenAI client with custom base URL for OpenRouter compatibility."""
        try:
            logger.info(f"Initializing OpenAI client with:")
            logger.info(f"  - base_url: {base_url}")
            logger.info(f"  - api_key: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else api_key}")
            
            self.openai_client = openai.OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            logger.info(f"✅ Successfully initialized client with base URL: {base_url}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize client: {e}")
            self.openai_client = None

        # Predefined categories for fallback and validation
        self.expense_categories = [
            'Food Delivery & Takeout',
            'Restaurants & Dining',
            'Cafes & Coffee Shops', 
            'Groceries & Supermarkets',
            'Fast Food & Quick Service',
            'Transportation',
            'Travel & Accommodation',
            'Shopping & Retail',
            'Entertainment & Recreation',
            'Healthcare & Medical',
            'Utilities & Bills',
            'Housing & Rent',
            'Education & Learning',
            'Personal Care & Beauty',
            'Professional Services',
            'Fitness & Wellness',
            'Banking & Fees',
            'Insurance',
            'Investments',
            'Other'
        ]

        self.income_categories = [
            'Salary',
            'Freelance',
            'Business Income',
            'Investment Returns',
            'Rental Income',
            'Refunds',
            'Gifts',
            'Other Income'
        ]

    async def categorize_transactions_with_llm(self, transactions: List[Transaction]) -> List[Transaction]:
        """Categorize transactions using LLM with batch processing for efficiency."""
        if not self.openai_client:
            logger.warning("OpenAI client not available. Using fallback categorization.")
            return [self._fallback_categorize(tx) for tx in transactions]

        # Process in batches to avoid token limits
        batch_size = 20
        categorized_transactions = []

        for i in range(0, len(transactions), batch_size):
            batch = transactions[i:i + batch_size]
            try:
                categorized_batch = await self._categorize_batch(batch)
                categorized_transactions.extend(categorized_batch)
            except Exception as e:
                logger.error(f"Error categorizing batch {i//batch_size + 1}: {e}")
                # Use fallback for failed batch
                categorized_transactions.extend([self._fallback_categorize(tx) for tx in batch])

        return categorized_transactions

    async def categorize_transactions_streaming(self, transactions: List[Transaction]):
        """Stream categorized transactions in batches for real-time UI updates."""
        if not self.openai_client:
            logger.warning("OpenAI client not available. Using fallback categorization.")
            # Yield fallback results in batches for consistency
            batch_size = 20
            total_batches = len(transactions) // batch_size + (1 if len(transactions) % batch_size else 0)
            
            all_processed = []
            for i in range(0, len(transactions), batch_size):
                batch = transactions[i:i + batch_size]
                categorized_batch = [self._fallback_categorize(tx) for tx in batch]
                all_processed.extend(categorized_batch)
                
                # Generate insights for fallback mode
                incremental_insights = self.generate_incremental_insights(all_processed)
                
                yield {
                    "event": "batch_complete",
                    "batch_number": i // batch_size + 1,
                    "total_batches": total_batches,
                    "progress_percentage": min(((i + batch_size) / len(transactions)) * 100, 100),
                    "new_transactions": [asdict(tx) for tx in categorized_batch],
                    "total_processed": len(all_processed),
                    "insights": incremental_insights
                }
            return

        # Process in batches with streaming
        batch_size = 20
        total_batches = len(transactions) // batch_size + (1 if len(transactions) % batch_size else 0)
        all_categorized = []

        for i in range(0, len(transactions), batch_size):
            batch = transactions[i:i + batch_size]
            batch_number = i // batch_size + 1
            
            try:
                logger.info(f"🔄 Processing batch {batch_number}/{total_batches} ({len(batch)} transactions)")
                categorized_batch = await self._categorize_batch(batch)
                all_categorized.extend(categorized_batch)
                
                # Calculate progress
                progress_percentage = min(((i + len(batch)) / len(transactions)) * 100, 100)
                
                # Generate incremental insights
                incremental_insights = self.generate_incremental_insights(all_categorized)
                
                # Yield batch results immediately
                yield {
                    "event": "batch_complete",
                    "batch_number": batch_number,
                    "total_batches": total_batches,
                    "progress_percentage": progress_percentage,
                    "new_transactions": [asdict(tx) for tx in categorized_batch],
                    "total_processed": len(all_categorized),
                    "insights": incremental_insights
                }
                
            except Exception as e:
                logger.error(f"Error categorizing batch {batch_number}: {e}")
                # Use fallback for failed batch but continue streaming
                fallback_batch = [self._fallback_categorize(tx) for tx in batch]
                all_categorized.extend(fallback_batch)
                
                progress_percentage = min(((i + len(batch)) / len(transactions)) * 100, 100)
                
                # Generate insights even for fallback
                incremental_insights = self.generate_incremental_insights(all_categorized)
                
                yield {
                    "event": "batch_complete",
                    "batch_number": batch_number,
                    "total_batches": total_batches,
                    "progress_percentage": progress_percentage,
                    "new_transactions": [asdict(tx) for tx in fallback_batch],
                    "total_processed": len(all_categorized),
                    "insights": incremental_insights,
                    "error": f"Batch {batch_number} failed, used fallback categorization"
                }

    def generate_incremental_insights(self, transactions: List[Transaction]) -> Dict[str, Any]:
        """Generate lightweight insights for streaming updates."""
        if not transactions:
            return {"summary": {"total_transactions": 0}}

        # Calculate basic metrics
        total_income = sum(tx.amount for tx in transactions if tx.type == "income")
        total_expenses = abs(sum(tx.amount for tx in transactions if tx.type == "expense"))
        net_cash_flow = total_income - total_expenses
        
        # Calculate confidence
        confidences = [tx.confidence for tx in transactions if tx.confidence is not None]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Get date range
        dates = [tx.date for tx in transactions if tx.date]
        date_range = {
            "from": min(dates) if dates else "",
            "to": max(dates) if dates else ""
        }
        
        # Category breakdowns
        income_breakdown = {}
        expense_breakdown = {}
        
        for tx in transactions:
            if tx.type == "income":
                income_breakdown[tx.category] = income_breakdown.get(tx.category, 0) + tx.amount
            else:
                expense_breakdown[tx.category] = expense_breakdown.get(tx.category, 0) + abs(tx.amount)
        
        # Top transactions (limit to avoid large payloads)
        expenses_sorted = sorted([tx for tx in transactions if tx.type == "expense"], 
                               key=lambda x: abs(x.amount), reverse=True)
        income_sorted = sorted([tx for tx in transactions if tx.type == "income"], 
                             key=lambda x: x.amount, reverse=True)
        
        return {
            "summary": {
                "total_transactions": len(transactions),
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net_cash_flow": net_cash_flow,
                "date_range": date_range,
                "categorization_confidence": avg_confidence
            },
            "income_breakdown": income_breakdown,
            "expense_breakdown": expense_breakdown,
            "top_expenses": [
                {"description": tx.description, "amount": tx.amount, "category": tx.category}
                for tx in expenses_sorted[:5]
            ],
            "top_income": [
                {"description": tx.description, "amount": tx.amount, "category": tx.category}
                for tx in income_sorted[:5]
            ],
            "low_confidence_count": len([tx for tx in transactions if tx.confidence < 0.6])
        }

    async def _categorize_batch(self, transactions: List[Transaction]) -> List[Transaction]:
        """Categorize a batch of transactions using OpenAI API."""

        # Prepare the prompt
        transaction_data = []
        for i, tx in enumerate(transactions):
            transaction_data.append({
                "id": i,
                "date": tx.date,
                "description": tx.description,
                "amount": tx.amount
            })

        expense_categories_str = ", ".join(self.expense_categories)
        income_categories_str = ", ".join(self.income_categories)

        prompt = f"""
You are a financial transaction categorizer. Analyze the following transactions and categorize each one using CONTEXT-AWARE analysis.

For each transaction, determine:
1. Type: "income" (positive cash flow) or "expense" (negative cash flow)
2. Category: Choose the most appropriate category from the lists below
3. Confidence: A score from 0.0 to 1.0 indicating how confident you are in the categorization

Expense Categories: {expense_categories_str}
Income Categories: {income_categories_str}

Transactions to categorize:
{json.dumps(transaction_data, indent=2)}

CONTEXT-AWARE CATEGORIZATION RULES:

1. ACTIVITY-BASED ANALYSIS (Primary Method):
   - Look for activity keywords: "lunch", "dinner", "breakfast", "coffee", "meal", "snack"
   - Business type indicators: "restaurant", "cafe", "hotel", "mall", "gym", "hospital"  
   - Service indicators: "delivery", "order", "subscription", "bill", "fee", "membership"

2. FOOD & DINING SUBCATEGORIES:
   - "Food Delivery & Takeout": delivery, order, takeout, takeaway keywords
   - "Restaurants & Dining": lunch, dinner, meal, restaurant, dining keywords
   - "Cafes & Coffee Shops": coffee, cafe, tea, breakfast keywords
   - "Groceries & Supermarkets": grocery, supermarket, market, vegetables, fruits
   - "Fast Food & Quick Service": drive-thru, counter, quick service patterns

3. AMOUNT PATTERN HINTS:
   - ₹200-800: Likely meals, coffee, small purchases
   - ₹1000-5000: Likely shopping, utilities, medium services
   - ₹10000+: Likely rent, insurance, large purchases, hotels

4. SMART INFERENCE:
   - "Subway Lunch" → Restaurants & Dining (lunch keyword)
   - "Swiggy Dinner Order" → Food Delivery & Takeout (dinner + order)
   - "Taj Hotel Mumbai" → Travel & Accommodation (hotel keyword)
   - "Third Wave Coffee" → Cafes & Coffee Shops (coffee keyword)
   - "Gym Membership" → Fitness & Wellness (gym + membership)

5. CONFIDENCE SCORING:
   - High (0.9+): Clear activity + business type match
   - Medium (0.7-0.8): Activity keyword OR business type clear
   - Low (0.5-0.6): Amount-based classification only

6. TYPE DETERMINATION PRIORITY:
   - Priority Income Keywords (override other words): reimbursement, refund, return, cashback, deposit, dividend, interest, bonus, salary, wage
   - Other Income: freelance, contract, consulting, business income, revenue, sales
   - Expense patterns: purchase, payment, withdrawal, bill, fee, charge
   - IMPORTANT: Priority keywords override conflicting words (e.g., "reimbursement" overrides "expense")
   - Use amount sign as final fallback: positive = income, negative = expense

7. FOCUS ON INTENT, NOT BRAND:
   - Don't memorize brand names
   - Focus on what the person DID (ate lunch, bought coffee, paid bill)
   - Use context clues to understand transaction purpose

Respond with a JSON array where each object has:
{{"id": transaction_id, "type": "income/expense", "category": "category_name", "confidence": confidence_score}}

Example response:
[
  {{"id": 0, "type": "expense", "category": "Restaurants & Dining", "confidence": 0.95}},
  {{"id": 1, "type": "income", "category": "Salary", "confidence": 0.90}}
]
"""

        try:
            logger.info(f"🚀 Making LLM API call:")
            logger.info(f"  - model: {self.model}")
            logger.info(f"  - base_url: {self.openai_client.base_url if self.openai_client else 'None'}")
            logger.info(f"  - batch size: {len(transactions)} transactions")
            
            response = await asyncio.to_thread(
                self.openai_client.chat.completions.create,
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a financial transaction categorizer. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=2000
            )
            
            logger.info(f"✅ Received response from LLM API")
            logger.info(f"  - tokens used: {response.usage.total_tokens if response.usage else 'unknown'}")

            # Parse the response
            categorizations = json.loads(response.choices[0].message.content)

            # Apply categorizations to transactions
            categorized_transactions = []
            for tx in transactions:
                categorized_tx = Transaction(
                    date=tx.date,
                    description=tx.description,
                    amount=tx.amount
                )

                # Find matching categorization
                tx_index = transactions.index(tx)
                categorization = next((cat for cat in categorizations if cat["id"] == tx_index), None)

                if categorization:
                    categorized_tx.type = categorization["type"]
                    categorized_tx.category = categorization["category"]
                    categorized_tx.confidence = categorization.get("confidence", 0.5)
                else:
                    # Fallback
                    categorized_tx = self._fallback_categorize(categorized_tx)

                categorized_transactions.append(categorized_tx)

            return categorized_transactions

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return [self._fallback_categorize(tx) for tx in transactions]

    def _fallback_categorize(self, transaction: Transaction) -> Transaction:
        """Fallback categorization using keyword matching."""
        description = transaction.description.lower()
        amount = transaction.amount

        # Priority income keywords (these override expense keywords)
        priority_income_keywords = ['reimbursement', 'refund', 'return', 'cashback', 'deposit', 'credit', 'dividend', 'interest', 'bonus', 'gift', 'salary', 'wage', 'income']
        
        # Check for priority income keywords first (these override everything)
        if any(keyword in description for keyword in priority_income_keywords):
            transaction.type = "income"
        # Then check for other income patterns
        elif any(keyword in description for keyword in ['payroll', 'paycheck', 'freelance', 'contract', 'consulting', 'business income', 'revenue', 'sales', 'tip']):
            transaction.type = "income"
        # Then check for expense keywords
        elif any(keyword in description for keyword in ['purchase', 'payment', 'withdrawal', 'debit', 'bill', 'fee', 'charge', 'business dinner', 'business lunch']):
            transaction.type = "expense"
        # Special case: if contains "expense" but also "reimbursement", it's income
        elif 'expense' in description and 'reimbursement' in description:
            transaction.type = "income"
        else:
            # Fallback to amount-based logic
            transaction.type = "income" if amount > 0 else "expense"
        

        # Simple keyword-based categorization
        if transaction.type == "income":
            income_keywords = {
                'Salary': ['salary', 'wage', 'payroll', 'paycheck'],
                'Freelance': ['freelance', 'contract', 'consulting'],
                'Business Income': ['business income', 'revenue', 'sales'],
                'Investment Returns': ['dividend', 'interest', 'capital gains'],
                'Refunds': ['refund', 'return', 'cashback', 'reimbursement'],
                'Gifts': ['gift', 'bonus', 'tip']
            }

            for category, keywords in income_keywords.items():
                if any(keyword in description for keyword in keywords):
                    transaction.category = category
                    transaction.confidence = 0.7
                    return transaction

            transaction.category = "Other Income"
            transaction.confidence = 0.3
        else:
            expense_keywords = {
                'Food Delivery & Takeout': ['delivery', 'order', 'takeout', 'takeaway', 'swiggy', 'zomato', 'uber eats', 'delivered'],
                'Restaurants & Dining': ['lunch', 'dinner', 'meal', 'restaurant', 'dining', 'dine', 'brunch'],
                'Cafes & Coffee Shops': ['coffee', 'cafe', 'tea', 'breakfast', 'espresso', 'latte', 'cappuccino'],
                'Groceries & Supermarkets': ['grocery', 'supermarket', 'vegetables', 'fruits', 'market', 'bazaar', 'vegetables', 'food hall'],
                'Fast Food & Quick Service': ['drive', 'counter', 'quick', 'fast food', 'sandwich', 'burger', 'pizza', 'taco', 'bell', 'kfc', 'mcdonalds'],
                'Transportation': ['taxi', 'uber', 'ola', 'bus', 'metro', 'train', 'fuel', 'petrol', 'gas', 'parking', 'ride'],
                'Travel & Accommodation': ['hotel', 'flight', 'travel', 'booking', 'accommodation', 'resort', 'airline', 'airport'],
                'Shopping & Retail': ['shopping', 'store', 'retail', 'mall', 'purchase', 'buy', 'clothes', 'electronics'],
                'Entertainment & Recreation': ['movie', 'cinema', 'netflix', 'spotify', 'gaming', 'theater', 'concert', 'entertainment'],
                'Healthcare & Medical': ['hospital', 'doctor', 'pharmacy', 'medical', 'health', 'clinic', 'medicine', 'treatment'],
                'Utilities & Bills': ['electric', 'electricity', 'water', 'internet', 'phone', 'cable', 'utility', 'bill'],
                'Housing & Rent': ['rent', 'mortgage', 'housing', 'apartment', 'house payment'],
                'Professional Services': ['subscription', 'software', 'service', 'professional', 'office', 'adobe', 'microsoft'],
                'Fitness & Wellness': ['gym', 'fitness', 'workout', 'yoga', 'health club', 'personal training', 'membership'],
                'Personal Care & Beauty': ['salon', 'spa', 'beauty', 'haircut', 'cosmetics', 'personal care'],
                'Education & Learning': ['course', 'education', 'learning', 'book', 'training', 'class'],
                'Banking & Fees': ['fee', 'charge', 'bank', 'atm', 'transfer', 'withdrawal fee'],
                'Insurance': ['insurance', 'premium', 'policy'],
                'Investments': ['investment', 'mutual fund', 'sip', 'stock', 'dividend']
            }

            # Enhanced confidence scoring based on keyword strength and context
            best_match = None
            best_confidence = 0.0
            
            for category, keywords in expense_keywords.items():
                for keyword in keywords:
                    if keyword in description:
                        # Calculate confidence based on keyword strength and context
                        confidence = 0.7  # Base confidence
                        
                        # Boost confidence for activity keywords
                        activity_keywords = ['lunch', 'dinner', 'breakfast', 'coffee', 'meal', 'order', 'delivery']
                        if keyword in activity_keywords:
                            confidence = 0.85
                        
                        # Boost confidence for exact business type matches
                        business_keywords = ['restaurant', 'cafe', 'hotel', 'gym', 'hospital', 'pharmacy']
                        if keyword in business_keywords:
                            confidence = 0.9
                        
                        # Boost confidence if multiple keywords match from same category
                        matching_keywords = [kw for kw in keywords if kw in description]
                        if len(matching_keywords) > 1:
                            confidence = min(0.95, confidence + 0.1 * (len(matching_keywords) - 1))
                        
                        # Check for exact keyword match vs partial
                        if keyword == description.lower().strip():
                            confidence = min(0.95, confidence + 0.1)
                        
                        if confidence > best_confidence:
                            best_match = category
                            best_confidence = confidence
            
            if best_match:
                transaction.category = best_match
                transaction.confidence = best_confidence
                return transaction

            transaction.category = "Other"
            transaction.confidence = 0.3

        return transaction

    def parse_csv_file(self, file_path: str) -> List[Transaction]:
        """Parse CSV file and return list of transactions."""
        transactions = []

        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                # Try to detect delimiter
                sample = file.read(1024)
                file.seek(0)

                sniffer = csv.Sniffer()
                delimiter = sniffer.sniff(sample).delimiter

                reader = csv.DictReader(file, delimiter=delimiter)

                for row in reader:
                    # Handle different column name variations
                    date = row.get('date') or row.get('Date') or row.get('DATE') or ''
                    description = row.get('description') or row.get('Description') or row.get('DESCRIPTION') or ''
                    amount_str = row.get('amount') or row.get('Amount') or row.get('AMOUNT') or '0'

                    try:
                        amount = float(amount_str.replace(',', '').replace('$', ''))
                    except ValueError:
                        amount = 0.0

                    transaction = Transaction(
                        date=date,
                        description=description,
                        amount=amount
                    )
                    transactions.append(transaction)

        except Exception as e:
            raise Exception(f"Error parsing CSV file: {e}")

        return transactions

    def parse_json_file(self, file_path: str) -> List[Transaction]:
        """Parse JSON file and return list of transactions."""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)

                # Handle different JSON structures
                if isinstance(data, list):
                    transactions_data = data
                elif isinstance(data, dict) and 'transactions' in data:
                    transactions_data = data['transactions']
                else:
                    raise ValueError("Invalid JSON structure")

                transactions = []
                for tx_data in transactions_data:
                    transaction = Transaction(
                        date=tx_data.get('date', ''),
                        description=tx_data.get('description', ''),
                        amount=float(tx_data.get('amount', 0))
                    )
                    transactions.append(transaction)

                return transactions

        except Exception as e:
            raise Exception(f"Error parsing JSON file: {e}")

    def generate_insights(self, transactions: List[Transaction]) -> Dict[str, Any]:
        """Generate comprehensive financial insights from categorized transactions."""
        insights = {
            "summary": {
                "total_transactions": len(transactions),
                "total_income": 0,
                "total_expenses": 0,
                "net_cash_flow": 0,
                "date_range": {"from": "", "to": ""},
                "categorization_confidence": 0
            },
            "income_breakdown": {},
            "expense_breakdown": {},
            "monthly_analysis": {},
            "top_expenses": [],
            "top_income": [],
            "category_insights": {},
            "low_confidence_transactions": []
        }

        if not transactions:
            return insights

        # Sort transactions by date
        transactions.sort(key=lambda x: x.date)
        insights["summary"]["date_range"]["from"] = transactions[0].date
        insights["summary"]["date_range"]["to"] = transactions[-1].date

        # Calculate average confidence
        confidences = [tx.confidence for tx in transactions if tx.confidence is not None]
        if confidences:
            insights["summary"]["categorization_confidence"] = sum(confidences) / len(confidences)

        # Process each transaction
        for transaction in transactions:
            amount = abs(transaction.amount)
            category = transaction.category or "Uncategorized"

            # Track low confidence transactions
            if transaction.confidence and transaction.confidence < 0.5:
                insights["low_confidence_transactions"].append({
                    "date": transaction.date,
                    "description": transaction.description,
                    "amount": transaction.amount,
                    "category": category,
                    "confidence": transaction.confidence
                })

            # Monthly analysis
            try:
                month_year = datetime.strptime(transaction.date, '%Y-%m-%d').strftime('%Y-%m')
            except:
                month_year = transaction.date[:7] if len(transaction.date) >= 7 else "Unknown"

            if month_year not in insights["monthly_analysis"]:
                insights["monthly_analysis"][month_year] = {
                    "income": 0, "expenses": 0, "net": 0
                }

            if transaction.type == "income":
                insights["summary"]["total_income"] += amount
                insights["monthly_analysis"][month_year]["income"] += amount

                # Income breakdown
                if category not in insights["income_breakdown"]:
                    insights["income_breakdown"][category] = {"amount": 0, "count": 0}
                insights["income_breakdown"][category]["amount"] += amount
                insights["income_breakdown"][category]["count"] += 1

                # Top income
                insights["top_income"].append({
                    "date": transaction.date,
                    "description": transaction.description,
                    "amount": amount,
                    "category": category
                })
            else:
                insights["summary"]["total_expenses"] += amount
                insights["monthly_analysis"][month_year]["expenses"] += amount

                # Expense breakdown
                if category not in insights["expense_breakdown"]:
                    insights["expense_breakdown"][category] = {"amount": 0, "count": 0}
                insights["expense_breakdown"][category]["amount"] += amount
                insights["expense_breakdown"][category]["count"] += 1

                # Top expenses
                insights["top_expenses"].append({
                    "date": transaction.date,
                    "description": transaction.description,
                    "amount": amount,
                    "category": category
                })

            # Update monthly net
            insights["monthly_analysis"][month_year]["net"] = (
                insights["monthly_analysis"][month_year]["income"] -
                insights["monthly_analysis"][month_year]["expenses"]
            )

        # Calculate net cash flow
        insights["summary"]["net_cash_flow"] = (
            insights["summary"]["total_income"] - insights["summary"]["total_expenses"]
        )

        # Sort and limit top transactions
        insights["top_expenses"].sort(key=lambda x: x["amount"], reverse=True)
        insights["top_expenses"] = insights["top_expenses"][:10]

        insights["top_income"].sort(key=lambda x: x["amount"], reverse=True)
        insights["top_income"] = insights["top_income"][:10]

        # Generate category insights
        total_expenses = insights["summary"]["total_expenses"]
        for category, data in insights["expense_breakdown"].items():
            insights["category_insights"][category] = {
                "percentage": (data["amount"] / total_expenses * 100) if total_expenses > 0 else 0,
                "average_amount": data["amount"] / data["count"] if data["count"] > 0 else 0
            }

        return insights

    async def generate_suggestions_with_llm(self, transactions: List[Transaction], insights: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate intelligent financial suggestions using LLM analysis."""
        if not self.openai_client:
            logger.warning("No LLM client available for suggestions generation")
            return self._generate_fallback_suggestions(transactions, insights)
        
        # Prepare summary data for LLM analysis
        summary = insights.get("summary", {})
        expense_breakdown = insights.get("expense_breakdown", {})
        income_breakdown = insights.get("income_breakdown", {})
        top_expenses = insights.get("top_expenses", [])
        low_confidence_count = insights.get("low_confidence_transactions", [])
        
        # Calculate key metrics
        total_income = summary.get("total_income", 0)
        total_expenses = summary.get("total_expenses", 0)
        net_cash_flow = summary.get("net_cash_flow", 0)
        savings_rate = (net_cash_flow / total_income * 100) if total_income > 0 else 0
        
        # Create analysis prompt
        prompt = f"""
You are a financial advisor analyzing spending patterns. Based on this financial data, provide personalized suggestions to improve financial health.

FINANCIAL OVERVIEW:
- Total Income: ₹{total_income:,.2f}
- Total Expenses: ₹{total_expenses:,.2f}
- Net Cash Flow: ₹{net_cash_flow:,.2f}
- Savings Rate: {savings_rate:.1f}%
- Total Transactions: {summary.get("total_transactions", 0)}
- Low Confidence Categorizations: {len(low_confidence_count)}

EXPENSE BREAKDOWN:
{json.dumps(expense_breakdown, indent=2)}

INCOME SOURCES:
{json.dumps(income_breakdown, indent=2)}

TOP EXPENSES:
{json.dumps(top_expenses[:5], indent=2)}

Provide 3-5 actionable financial suggestions. Format as JSON array with these fields:
- id: unique identifier
- title: clear, actionable title
- description: specific advice with reasoning
- category: type of suggestion (savings/spending/budget/investment)
- impact: expected benefit level (high/medium/low)
- estimatedSavings: optional monthly savings estimate as a number in INR (e.g., 2500 for ₹2,500)

All monetary amounts should be in Indian Rupees (₹). Focus on practical improvements based on the actual spending patterns shown.
"""

        try:
            logger.info("Generating LLM-based financial suggestions...")
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.openai_client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a practical financial advisor. Analyze spending data and provide actionable advice. Respond only with valid JSON."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    max_tokens=1500,
                    temperature=0.7
                )
            )
            
            suggestions_text = response.choices[0].message.content.strip()
            
            # Clean up response - remove any markdown formatting
            if suggestions_text.startswith("```json"):
                suggestions_text = suggestions_text[7:]
            if suggestions_text.endswith("```"):
                suggestions_text = suggestions_text[:-3]
            suggestions_text = suggestions_text.strip()
            
            # Parse JSON response
            suggestions = json.loads(suggestions_text)
            
            # Validate and clean suggestions
            validated_suggestions = []
            for suggestion in suggestions:
                if all(key in suggestion for key in ["id", "title", "description", "category", "impact"]):
                    # Ensure valid category and impact values
                    if suggestion["category"] in ["savings", "spending", "budget", "investment"] and \
                       suggestion["impact"] in ["high", "medium", "low"]:
                        validated_suggestions.append(suggestion)
            
            logger.info(f"Generated {len(validated_suggestions)} valid LLM suggestions")
            return validated_suggestions
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM suggestions JSON: {e}")
            logger.error(f"Raw response: {suggestions_text[:500]}...")
            return self._generate_fallback_suggestions(transactions, insights)
        except Exception as e:
            logger.error(f"Error generating LLM suggestions: {e}")
            return self._generate_fallback_suggestions(transactions, insights)

    def _generate_fallback_suggestions(self, transactions: List[Transaction], insights: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate basic fallback suggestions when LLM is unavailable."""
        suggestions = []
        
        summary = insights.get("summary", {})
        expense_breakdown = insights.get("expense_breakdown", {})
        low_confidence_count = len(insights.get("low_confidence_transactions", []))
        
        # Basic suggestion for low confidence transactions
        if low_confidence_count > 0:
            suggestions.append({
                "id": "review-transactions",
                "title": "Review Transaction Categories",
                "description": f"You have {low_confidence_count} transactions with low confidence categorization. Review these to improve your expense tracking accuracy.",
                "category": "budget",
                "impact": "medium"
            })
        
        # Basic high spending category suggestion
        if expense_breakdown:
            top_category = max(expense_breakdown.items(), key=lambda x: x[1])
            if top_category[1] > 0:
                suggestions.append({
                    "id": "top-spending",
                    "title": f"Monitor {top_category[0]} Spending",
                    "description": f"{top_category[0]} is your highest expense category at ₹{top_category[1]:,.2f}. Consider setting a monthly budget for this category.",
                    "category": "budget",
                    "impact": "medium",
                    "estimatedSavings": round(top_category[1] * 0.1, 2)
                })
        
        # Basic savings suggestion
        total_income = summary.get("total_income", 0)
        total_expenses = summary.get("total_expenses", 0)
        if total_income > 0:
            savings_rate = ((total_income - total_expenses) / total_income) * 100
            if savings_rate < 20:
                suggestions.append({
                    "id": "improve-savings",
                    "title": "Increase Your Savings Rate",
                    "description": f"Your current savings rate is {savings_rate:.1f}%. Consider aiming for 20% by reducing discretionary spending.",
                    "category": "savings",
                    "impact": "high"
                })
        
        return suggestions

# Create the MCP server
app = Server("financial-analyzer")

# Initialize the analyzer
analyzer = FinancialAnalyzer()

@app.list_tools()
async def list_tools() -> List[Tool]:
    """List available tools."""
    return [
        Tool(
            name="analyze_financial_file",
            description="Analyze financial transaction data from CSV or JSON files with AI-powered categorization",
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the financial data file (CSV or JSON format)"
                    },
                    "use_llm": {
                        "type": "boolean",
                        "description": "Whether to use LLM for categorization (default: true)",
                        "default": True
                    }
                },
                "required": ["file_path"]
            }
        ),
        Tool(
            name="categorize_transactions",
            description="Categorize transactions provided as JSON data using AI",
            inputSchema={
                "type": "object",
                "properties": {
                    "transactions": {
                        "type": "array",
                        "description": "Array of transaction objects with date, description, and amount",
                        "items": {
                            "type": "object",
                            "properties": {
                                "date": {"type": "string"},
                                "description": {"type": "string"},
                                "amount": {"type": "number"}
                            },
                            "required": ["date", "description", "amount"]
                        }
                    },
                    "use_llm": {
                        "type": "boolean",
                        "description": "Whether to use LLM for categorization (default: true)",
                        "default": True
                    }
                },
                "required": ["transactions"]
            }
        ),
        Tool(
            name="configure_llm",
            description="Configure the LLM provider (API key, base URL, model)",
            inputSchema={
                "type": "object",
                "properties": {
                    "api_key": {
                        "type": "string",
                        "description": "API key for the LLM provider"
                    },
                    "base_url": {
                        "type": "string",
                        "description": "Base URL for the API (e.g., https://openrouter.ai/api/v1)",
                        "default": "https://openrouter.ai/api/v1"
                    },
                    "model": {
                        "type": "string",
                        "description": "Model to use (e.g., openai/gpt-4o-mini, anthropic/claude-3-haiku)",
                        "default": "openai/gpt-4o-mini"
                    }
                },
                "required": ["api_key"]
            }
        ),
        Tool(
            name="list_available_models",
            description="List popular models available on OpenRouter",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls."""

    if name == "configure_llm":
        api_key = arguments.get("api_key")
        base_url = arguments.get("base_url", "https://openrouter.ai/api/v1")
        model = arguments.get("model", "openai/gpt-4o-mini")

        if not api_key:
            return [TextContent(type="text", text="Error: API key is required")]

        try:
            # Re-initialize the analyzer with new configuration
            global analyzer
            analyzer = FinancialAnalyzer(api_key=api_key, base_url=base_url, model=model)

            config_info = {
                "status": "success",
                "message": "LLM configuration updated successfully",
                "base_url": base_url,
                "model": model,
                "provider": "OpenRouter" if "openrouter.ai" in base_url else "Custom"
            }

            return [TextContent(type="text", text=json.dumps(config_info, indent=2))]
        except Exception as e:
            return [TextContent(type="text", text=f"Error configuring LLM: {e}")]

    elif name == "list_available_models":
        models_info = {
            "popular_openrouter_models": {
                "cost_effective": [
                    {
                        "name": "openai/gpt-4o-mini",
                        "description": "Fast and affordable GPT-4 variant",
                        "cost": "$0.15/1M input tokens"
                    },
                    {
                        "name": "anthropic/claude-3-haiku",
                        "description": "Fast Claude model for simple tasks",
                        "cost": "$0.25/1M input tokens"
                    },
                    {
                        "name": "google/gemini-flash-1.5",
                        "description": "Google's fast model",
                        "cost": "$0.075/1M input tokens"
                    }
                ],
                "high_performance": [
                    {
                        "name": "anthropic/claude-3-5-sonnet",
                        "description": "Excellent reasoning and analysis",
                        "cost": "$3/1M input tokens"
                    },
                    {
                        "name": "openai/gpt-4-turbo",
                        "description": "Advanced GPT-4 with better performance",
                        "cost": "$10/1M input tokens"
                    },
                    {
                        "name": "google/gemini-pro-1.5",
                        "description": "Advanced Google model",
                        "cost": "$1.25/1M input tokens"
                    }
                ]
            },
            "note": "Visit https://openrouter.ai/models for the complete list and current pricing"
        }

        return [TextContent(type="text", text=json.dumps(models_info, indent=2))]

    elif name == "analyze_financial_file":
        file_path = arguments.get("file_path")
        use_llm = arguments.get("use_llm", True)

        if not file_path:
            return [TextContent(type="text", text="Error: file_path is required")]

        try:
            # Check if file exists
            if not Path(file_path).exists():
                return [TextContent(type="text", text=f"Error: File not found: {file_path}")]

            # Parse the file
            file_extension = Path(file_path).suffix.lower()
            if file_extension == '.csv':
                transactions = analyzer.parse_csv_file(file_path)
            elif file_extension == '.json':
                transactions = analyzer.parse_json_file(file_path)
            else:
                return [TextContent(type="text", text="Error: Unsupported file format. Use CSV or JSON.")]

            # Categorize transactions
            if use_llm:
                transactions = await analyzer.categorize_transactions_with_llm(transactions)
            else:
                transactions = [analyzer._fallback_categorize(tx) for tx in transactions]

            # Generate insights
            insights = analyzer.generate_insights(transactions)

            return [TextContent(type="text", text=json.dumps(insights, indent=2))]

        except Exception as e:
            return [TextContent(type="text", text=f"Error analyzing file: {e}")]

    elif name == "categorize_transactions":
        transactions_data = arguments.get("transactions", [])
        use_llm = arguments.get("use_llm", True)

        if not transactions_data:
            return [TextContent(type="text", text="Error: transactions array is required")]

        try:
            # Convert to Transaction objects
            transactions = []
            for tx_data in transactions_data:
                transaction = Transaction(
                    date=tx_data.get("date", ""),
                    description=tx_data.get("description", ""),
                    amount=float(tx_data.get("amount", 0))
                )
                transactions.append(transaction)

            # Categorize transactions
            if use_llm:
                transactions = await analyzer.categorize_transactions_with_llm(transactions)
            else:
                transactions = [analyzer._fallback_categorize(tx) for tx in transactions]

            # Convert back to dict format
            result = [asdict(tx) for tx in transactions]

            return [TextContent(type="text", text=json.dumps(result, indent=2))]

        except Exception as e:
            return [TextContent(type="text", text=f"Error categorizing transactions: {e}")]

    else:
        return [TextContent(type="text", text=f"Unknown tool: {name}")]

async def main():
    """Main entry point for the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="financial-analyzer",
                server_version="1.0.0",
                capabilities=app.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={}
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())

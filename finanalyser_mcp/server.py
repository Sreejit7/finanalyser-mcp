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
        self.model = model or "openai/gpt-4o-mini"  # Default to OpenRouter's GPT-4o-mini
        self.base_url = base_url or "https://openrouter.ai/api/v1"  # Default to OpenRouter

        # Try to initialize client with provided parameters
        if api_key:
            self._initialize_client(api_key, self.base_url)
        elif os.getenv("OPENROUTER_API_KEY"):
            self._initialize_client(os.getenv("OPENROUTER_API_KEY"), self.base_url)
        elif os.getenv("OPENAI_API_KEY") and not base_url:
            # Fallback to OpenAI if no custom base_url and OpenAI key exists
            self._initialize_client(os.getenv("OPENAI_API_KEY"), "https://api.openai.com/v1")
            self.model = "gpt-4o-mini"
        else:
            logger.warning("No API key provided. LLM categorization will be disabled.")

    def _initialize_client(self, api_key: str, base_url: str):
        """Initialize the OpenAI client with custom base URL for OpenRouter compatibility."""
        try:
            self.openai_client = openai.OpenAI(
                api_key=api_key,
                base_url=base_url
            )
            logger.info(f"Initialized client with base URL: {base_url}")
        except Exception as e:
            logger.error(f"Failed to initialize client: {e}")
            self.openai_client = None

        # Predefined categories for fallback and validation
        self.expense_categories = [
            'Food & Dining',
            'Transportation',
            'Shopping',
            'Entertainment',
            'Healthcare',
            'Utilities',
            'Housing',
            'Education',
            'Personal Care',
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
You are a financial transaction categorizer. Analyze the following transactions and categorize each one.

For each transaction, determine:
1. Type: "income" (positive cash flow) or "expense" (negative cash flow)
2. Category: Choose the most appropriate category from the lists below
3. Confidence: A score from 0.0 to 1.0 indicating how confident you are in the categorization

Expense Categories: {expense_categories_str}
Income Categories: {income_categories_str}

Transactions to categorize:
{json.dumps(transaction_data, indent=2)}

Rules:
- If amount is positive, it's usually income
- If amount is negative, it's usually an expense
- Consider the description carefully for context
- Use "Other" or "Other Income" for unclear cases
- Be consistent with similar transactions

Respond with a JSON array where each object has:
{{"id": transaction_id, "type": "income/expense", "category": "category_name", "confidence": confidence_score}}

Example response:
[
  {{"id": 0, "type": "expense", "category": "Food & Dining", "confidence": 0.95}},
  {{"id": 1, "type": "income", "category": "Salary", "confidence": 0.90}}
]
"""

        try:
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

        # Determine type based on amount
        transaction.type = "income" if amount > 0 else "expense"

        # Simple keyword-based categorization
        if transaction.type == "income":
            income_keywords = {
                'Salary': ['salary', 'wage', 'payroll', 'paycheck'],
                'Freelance': ['freelance', 'contract', 'consulting'],
                'Business Income': ['business', 'revenue', 'sales'],
                'Investment Returns': ['dividend', 'interest', 'capital gains'],
                'Refunds': ['refund', 'return', 'cashback'],
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
                'Food & Dining': ['restaurant', 'food', 'dining', 'cafe', 'pizza', 'mcdonalds', 'starbucks', 'grocery', 'supermarket'],
                'Transportation': ['uber', 'lyft', 'taxi', 'gas', 'fuel', 'metro', 'bus', 'train', 'parking'],
                'Shopping': ['amazon', 'walmart', 'target', 'store', 'shopping', 'retail'],
                'Entertainment': ['movie', 'netflix', 'spotify', 'gaming', 'theater', 'concert'],
                'Healthcare': ['hospital', 'doctor', 'pharmacy', 'medical', 'health', 'clinic'],
                'Utilities': ['electric', 'water', 'internet', 'phone', 'cable', 'utility'],
                'Housing': ['rent', 'mortgage', 'housing', 'apartment'],
                'Banking & Fees': ['fee', 'charge', 'bank', 'atm']
            }

            for category, keywords in expense_keywords.items():
                if any(keyword in description for keyword in keywords):
                    transaction.category = category
                    transaction.confidence = 0.7
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

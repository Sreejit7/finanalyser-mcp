# Financial Data Analysis MCP Server & Web Application

A powerful Model Context Protocol (MCP) server **with web interface** that analyzes financial transaction data using AI-powered categorization with OpenRouter, OpenAI, or any OpenAI-compatible API provider.

## 🌐 Web Application

This project now includes a **modern web interface** built with React + TypeScript + Tailwind CSS that provides:
- **Drag-and-drop file upload** for CSV/JSON files
- **Interactive charts** for spending analysis
- **Sortable transaction table** with filtering
- **Real-time insights** and categorization confidence scores
- **Mobile-responsive design**

## 🚀 Features

- **Multi-Provider AI Support**: Works with OpenRouter, OpenAI, or any OpenAI-compatible API
- **Model Flexibility**: Choose from various models (GPT-4, Claude, Gemini, etc.) through OpenRouter
- **Cost-Effective**: Use cheaper models for basic categorization or premium models for complex analysis
- **Intelligent Categorization**: AI understands transaction context beyond simple keywords
- **Fallback System**: Keyword-based categorization when LLM is unavailable
- **Confidence Scoring**: Each categorization includes a confidence score
- **Multiple File Formats**: Supports CSV and JSON files
- **Comprehensive Analysis**: Detailed insights including spending patterns, trends, and breakdowns
- **Batch Processing**: Efficient handling of large transaction datasets

## 📋 Prerequisites

- Python 3.8 or higher
- OpenRouter API key (recommended) or OpenAI API key
- MCP-compatible client (like Claude / Zed / Cursor)

## 🔧 Installation

1. **Clone or create the project directory**:
```bash
mkdir finanalyser-mcp
cd finanalyser-mcp
```

2. **Create the project structure**:
```
finanalyser-mcp/
├── finanalyser_mcp/
│   ├── __init__.py
│   └── server.py
├── requirements.txt
├── pyproject.toml
└── README.md
```

3. **Save the Python code**:
   - Create `finanalyser_mcp/__init__.py` (empty file)
   - Save the main server code as `finanalyser_mcp/server.py`

4. **Create and activate virtual environment**:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

5. **Install the package**:
```bash
pip install -e .
```

## 🔑 API Provider Setup

### Option 1: OpenRouter (Recommended)

1. **Get an API key** from [OpenRouter](https://openrouter.ai/keys)
2. **Set environment variable**:
```bash
export OPENROUTER_API_KEY="your-openrouter-key"
```

3. **Or configure via MCP tool**:
```json
{
  "tool": "configure_llm",
  "arguments": {
    "api_key": "your-openrouter-key",
    "base_url": "https://openrouter.ai/api/v1",
    "model": "openai/gpt-4o-mini"
  }
}
```

### Option 2: OpenAI Direct

```bash
export OPENAI_API_KEY="your-openai-key"
```

### Option 3: Other OpenAI-Compatible Providers

```json
{
  "tool": "configure_llm",
  "arguments": {
    "api_key": "your-api-key",
    "base_url": "https://your-provider.com/v1",
    "model": "your-model-name"
  }
}
```

## 🎯 Usage

### Running the Server

```bash
python -m finanalyser_mcp.server
```

### Available Models (via OpenRouter)

Use the `list_available_models` tool to see popular options:

#### Cost-Effective Models:
- `openai/gpt-4o-mini` - $0.15/1M tokens (recommended for most use cases)
- `anthropic/claude-3-haiku` - $0.25/1M tokens
- `google/gemini-flash-1.5` - $0.075/1M tokens

#### High-Performance Models:
- `anthropic/claude-3-5-sonnet` - $3/1M tokens (excellent for complex analysis)
- `openai/gpt-4-turbo` - $10/1M tokens
- `google/gemini-pro-1.5` - $1.25/1M tokens

## 🎯 Usage

### Web Application (Recommended)

1. **Development mode** (hot reload):
```bash
# Install dependencies
pip install -r requirements.txt
cd frontend && bun install

# Start both backend + frontend
python run_dev.py
```
Then visit: http://localhost:3000

2. **Production mode**:
```bash
# Build and run
python build_production.py
python -m uvicorn web_api:app --host 0.0.0.0 --port 8000
```
Then visit: http://localhost:8000

### MCP Server (for CLI/IDE integration)

```bash
python -m finanalyser_mcp.server
```

Or if installed:
```bash
finanalyser-mcp
```

### File Formats Supported

#### CSV Format
```csv
date,description,amount
2024-01-15,Starbucks Coffee,-4.50
2024-01-15,Salary Deposit,3000.00
2024-01-16,Uber Ride,-12.30
2024-01-17,Amazon Purchase,-45.99
```

#### JSON Format
```json
{
  "transactions": [
    {
      "date": "2024-01-15",
      "description": "Starbucks Coffee",
      "amount": -4.50
    },
    {
      "date": "2024-01-15",
      "description": "Salary Deposit",
      "amount": 3000.00
    }
  ]
}
```

## 🛠️ Available Tools

### 1. `configure_llm`
Configure the LLM provider, model, and API settings.

**Parameters:**
- `api_key` (string, required): Your API key
- `base_url` (string, optional): API base URL (default: OpenRouter)
- `model` (string, optional): Model to use (default: openai/gpt-4o-mini)

**Example:**
```json
{
  "tool": "configure_llm",
  "arguments": {
    "api_key": "sk-or-v1-your-key",
    "base_url": "https://openrouter.ai/api/v1",
    "model": "anthropic/claude-3-haiku"
  }
}
```

### 2. `list_available_models`
List popular models available on OpenRouter with pricing information.

**Example:**
```json
{
  "tool": "list_available_models",
  "arguments": {}
}
```

### 3. `analyze_financial_file`
Analyzes financial data from a file with AI-powered categorization.

**Parameters:**
- `file_path` (string, required): Path to the CSV or JSON file
- `use_llm` (boolean, optional): Whether to use AI categorization (default: true)

**Example:**
```json
{
  "tool": "analyze_financial_file",
  "arguments": {
    "file_path": "/path/to/transactions.csv",
    "use_llm": true
  }
}
```

### 4. `categorize_transactions`
Categorizes transactions provided directly as JSON data.

**Parameters:**
- `transactions` (array, required): Array of transaction objects
- `use_llm` (boolean, optional): Whether to use AI categorization (default: true)

**Example:**
```json
{
  "tool": "categorize_transactions",
  "arguments": {
    "transactions": [
      {
        "date": "2024-01-15",
        "description": "McDonald's Drive Thru",
        "amount": -8.99
      }
    ],
    "use_llm": true
  }
}
```

## 📊 AI Categorization

The system uses OpenAI's GPT-4 to intelligently categorize transactions into these categories:

### Expense Categories:
- Food & Dining
- Transportation
- Shopping
- Entertainment
- Healthcare
- Utilities
- Housing
- Education
- Personal Care
- Banking & Fees
- Insurance
- Investments
- Other

### Income Categories:
- Salary
- Freelance
- Business Income
- Investment Returns
- Rental Income
- Refunds
- Gifts
- Other Income

## 📈 Analysis Output

The system provides comprehensive analysis including:

```json
{
  "summary": {
    "total_transactions": 150,
    "total_income": 250000.00,
    "total_expenses": 185000.00,
    "net_cash_flow": 65000.00,
    "date_range": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "categorization_confidence": 0.92
  },
  "income_breakdown": {
    "Salary": {
      "amount": 250000.00,
      "count": 2
    }
  },
  "expense_breakdown": {
    "Food & Dining": {
      "amount": 22000.00,
      "count": 25
    },
    "Transportation": {
      "amount": 12000.00,
      "count": 15
    }
  },
  "monthly_analysis": {
    "2024-01": {
      "income": 250000.00,
      "expenses": 185000.00,
      "net": 65000.00
    }
  },
  "top_expenses": [...],
  "top_income": [...],
  "category_insights": {
    "Food & Dining": {
      "percentage": 11.89,
      "average_amount": 880.00
    }
  },
  "low_confidence_transactions": [
    {
      "date": "2024-01-15",
      "description": "ACME Corp Payment", 
      "amount": -7500.00,
      "category": "Other",
      "confidence": 0.3
    }
  ]
}
```

## 🔍 Key Features Explained

### AI-Powered Categorization
- Uses GPT-4 for intelligent transaction analysis
- Considers transaction amount, description, and context
- Provides confidence scores for each categorization
- Processes transactions in batches for efficiency

### Fallback System
- Automatic keyword-based categorization when AI is unavailable
- Ensures the system works even without an API key
- Lower confidence scores indicate fallback categorization

### Confidence Tracking
- Each transaction gets a confidence score (0.0 to 1.0)
- Low confidence transactions are flagged for manual review
- Overall categorization confidence is calculated

### Batch Processing
- Handles large datasets efficiently
- Processes up to 20 transactions per API call
- Automatic fallback for failed batches

## 🔧 Integration with Claude

To use this MCP server with Claude, add it to your MCP configuration file:

### For macOS/Linux (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "financial-analyzer": {
      "command": "/path/to/your/venv/bin/python",
      "args": ["-m", "finanalyser_mcp.server"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-key-here"
      }
    }
  }
}
```

### For Windows (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "financial-analyzer": {
      "command": "C:\\path\\to\\your\\venv\\Scripts\\python.exe",
      "args": ["-m", "finanalyser_mcp.server"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-key-here"
      }
    }
  }
}
```

### Alternative Configuration (Multiple Providers)
```json
{
  "mcpServers": {
    "financial-analyzer": {
      "command": "/path/to/your/venv/bin/python",
      "args": ["-m", "finanalyser_mcp.server"],
      "env": {
        "OPENROUTER_API_KEY": "sk-or-v1-your-openrouter-key",
        "OPENAI_API_KEY": "sk-your-openai-key"
      }
    }
  }
}
```

## 📝 Sample Data for Testing

Create a test file `sample_transactions.csv`:

```csv
date,description,amount
2024-01-01,Salary Deposit,120000.00
2024-01-02,Cafe Coffee Day,-350.00
2024-01-02,Ola to Airport,-850.00
2024-01-03,Amazon Prime Subscription,-1499.00
2024-01-04,Big Bazaar Grocery,-2200.00
2024-01-05,Netflix Monthly,-649.00
2024-01-06,Petrol Pump - HPCL,-3500.00
2024-01-07,Restaurant - Barbeque Nation,-1890.00
2024-01-08,ATM Withdrawal Fee,-25.00
2024-01-09,Freelance Project Payment,45000.00
2024-01-10,Reliance Digital Shopping,-3250.00
2024-01-11,Gym Membership,-2500.00
2024-01-12,Electricity Bill - MSEB,-4200.00
2024-01-13,Doctor Visit Fees,-800.00
2024-01-14,PVR Cinema,-750.00
2024-01-15,House Rent,-25000.00
```

## 🐛 Troubleshooting

### Common Issues

1. **API Key Not Working**
   - For OpenRouter: Ensure your key starts with `sk-or-v1-`
   - Verify your API key is correct and has sufficient credits
   - Check the model name format (e.g., `openai/gpt-4o-mini` for OpenRouter)

2. **Model Not Found Error**
   - Use `list_available_models` tool to see supported models
   - Ensure model name follows provider's naming convention
   - For OpenRouter, use format: `provider/model-name`

3. **File Parsing Errors**
   - Check your CSV format matches the expected columns
   - Ensure amounts are in numeric format (no currency symbols)
   - Verify file encoding is UTF-8

4. **Low Categorization Accuracy**
   - Try a more powerful model (e.g., Claude 3.5 Sonnet)
   - Review the `low_confidence_transactions` in the output
   - Consider manually reviewing and updating categories
   - Add more context to transaction descriptions if possible

5. **Performance Issues**
   - Large files are processed in batches automatically
   - Consider splitting very large files (>1000 transactions)
   - Monitor API rate limits
   - Use cheaper models for large datasets

### Error Messages

- `"LLM client not available"`: Configure your API key using the `configure_llm` tool
- `"File not found"`: Check the file path is correct and file exists
- `"Unsupported file format"`: Use only CSV or JSON files
- `"Error parsing CSV/JSON"`: Check file format and structure
- `"Model not found"`: Verify the model name is correct for your provider

## 💰 Cost Optimization

### Choosing the Right Model

**For Basic Categorization:**
- `google/gemini-flash-2.5-lite` ($0.075/1M tokens) - Most cost-effective
- `openai/gpt-4o-mini` ($0.15/1M tokens) - Good balance of cost/performance

**For Complex Analysis:**
- `anthropic/claude-3-haiku` ($0.25/1M tokens) - Good reasoning
- `anthropic/claude-3-5-sonnet` ($3/1M tokens) - Best accuracy

**Estimated Costs (1000 transactions):**
- Gemini Flash: ~$0.01
- GPT-4o Mini: ~$0.02
- Claude Haiku: ~$0.03
- Claude Sonnet: ~$0.30

### Batch Processing Benefits
- Reduces API calls by 20x (processes 20 transactions per call)
- Significantly lowers costs compared to individual transaction calls
- Maintains high accuracy through contextual batch analysis

## 🔒 Security Considerations

- API keys are handled securely and not logged
- Transaction data is processed locally and only descriptions are sent to OpenAI
- No financial data is stored permanently
- Consider using environment variables for API keys in production

## 🚀 Advanced Usage

### Custom Categorization
You can modify the categories in the code by updating the `expense_categories` and `income_categories` lists in the `FinancialAnalyzer` class.

### Batch Size Adjustment
Modify the `batch_size` variable in `categorize_transactions_with_llm` method to process more or fewer transactions per API call.

### Temperature Adjustment
Change the `temperature` parameter in the OpenAI API call to make categorization more or less creative (0.0 = deterministic, 1.0 = creative).

## 📚 API Reference

### Transaction Object Structure
```python
@dataclass
class Transaction:
    date: str              # ISO date format (YYYY-MM-DD)
    description: str       # Transaction description
    amount: float         # Transaction amount (+ for income, - for expense)
    category: str         # AI-assigned category
    type: str            # "income" or "expense"
    confidence: float    # Confidence score (0.0 to 1.0)
```

### Error Handling
All tools return error messages in a consistent format:
```json
{
  "error": "Error message describing what went wrong"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the error messages for specific guidance
3. Ensure all dependencies are installed correctly
4. Verify your OpenAI API key is valid and has credits

For additional support, please open an issue in the project repository.
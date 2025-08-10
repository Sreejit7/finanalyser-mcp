# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Financial Data Analysis MCP (Model Context Protocol) server that provides AI-powered transaction categorization using OpenRouter, OpenAI, or any OpenAI-compatible API provider. The server analyzes financial transaction data from CSV/JSON files and categorizes them intelligently using LLMs.

## Development Commands

### Setup and Installation
```bash
# Install dependencies
pip install -r requirements.txt

# For development dependencies
pip install -e ".[dev]"
```

### Running the Server
```bash
# Run the MCP server
python -m finanalyser_mcp.server

# Alternative if installed
financial-analyzer-mcp
```

### Code Quality Commands
```bash
# Format code
black finanalyser_mcp/

# Sort imports
isort finanalyser_mcp/

# Type checking
mypy finanalyser_mcp/

# Run tests (if pytest is installed)
pytest
```

## Architecture

### Core Components

1. **FinancialAnalyzer** (`finanalyser_mcp/server.py:40`): Main analysis engine
   - Handles LLM client initialization with OpenRouter/OpenAI compatibility
   - Provides both AI-powered and fallback keyword-based categorization
   - Batch processing for efficiency (20 transactions per API call)

2. **Transaction** (`finanalyser_mcp/server.py:31`): Data model for financial transactions
   - Contains date, description, amount, category, type, and confidence fields

3. **MCP Tools** (`finanalyser_mcp/server.py:455`): Four main tools exposed via MCP:
   - `configure_llm`: Set up API provider and model
   - `list_available_models`: Show available models with pricing
   - `analyze_financial_file`: Process CSV/JSON files
   - `categorize_transactions`: Categorize transaction arrays directly

### Key Features

- **Multi-provider support**: OpenRouter (default), OpenAI, or custom OpenAI-compatible APIs
- **Intelligent categorization**: Uses LLM prompting with 13 expense and 8 income categories
- **Fallback system**: Keyword-based categorization when LLM unavailable
- **Batch processing**: Efficient handling of large datasets
- **Confidence scoring**: Each categorization includes confidence (0.0-1.0)
- **Comprehensive analysis**: Generates insights including spending patterns, monthly breakdowns, and category analysis

### File Structure

- `finanalyser_mcp/server.py`: Main server implementation with all logic
- `finanalyser_mcp/__init__.py`: Package initialization (empty)
- `requirements.txt`: Core dependencies (mcp, openai, pydantic)
- `pyproject.toml`: Project configuration with development dependencies

## Configuration

### API Keys
The server checks for API keys in this order:
1. Provided via `configure_llm` tool
2. `OPENROUTER_API_KEY` environment variable
3. `OPENAI_API_KEY` environment variable (falls back to OpenAI direct)

### Model Selection
- Default: `openai/gpt-4o-mini` via OpenRouter
- Cost-effective options: `google/gemini-flash-1.5`, `anthropic/claude-3-haiku`
- High-performance options: `anthropic/claude-3-5-sonnet`, `openai/gpt-4-turbo`

## Error Handling

The system includes robust error handling:
- API failures fall back to keyword-based categorization
- Batch processing continues even if individual batches fail
- File parsing handles various CSV/JSON formats
- Low confidence transactions are flagged for manual review

## Development Notes

- Uses asyncio for concurrent processing
- Implements proper logging throughout
- Handles various file formats and column name variations
- Includes comprehensive docstrings and type hints
- Uses dataclasses for clean data modeling
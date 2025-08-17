from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
import tempfile
import os
import json
from typing import Dict, Any
import asyncio
from dotenv import load_dotenv

from finanalyser_mcp.server import FinancialAnalyzer, Transaction

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="Financial Analyzer API", version="1.0.0")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Check environment variables at startup
print("🌍 Environment Configuration:")
print("API Keys:")
print(f"  - OPENROUTER_API_KEY: {'Set' if os.getenv('OPENROUTER_API_KEY') else 'Not set'}")
print(f"  - OPENAI_API_KEY: {'Set' if os.getenv('OPENAI_API_KEY') else 'Not set'}")
print("Model Configuration:")
print(f"  - DEFAULT_MODEL: {os.getenv('DEFAULT_MODEL', 'google/gemini-flash-1.5 (default)')}")
print(f"  - BASE_URL: {os.getenv('BASE_URL', 'https://openrouter.ai/api/v1 (default)')}")

if not os.getenv('OPENROUTER_API_KEY') and not os.getenv('OPENAI_API_KEY'):
    print()
    print("⚠️  No API keys found!")
    print("📝 To set up your configuration, choose one of these options:")
    print("   1. Create .env file: cp .env.example .env (then edit it)")
    print("   2. Set environment variables:")
    print("      export OPENROUTER_API_KEY='your-key-here'")
    print("      export DEFAULT_MODEL='google/gemini-flash-1.5'")
    print("   3. Use the API configuration endpoint (POST /api/configure)")
    print()

# Initialize the analyzer
print("🔧 Initializing default analyzer...")
analyzer = FinancialAnalyzer()
print("✅ Default analyzer initialized")

@app.post("/api/analyze")
async def analyze_file(
    file: UploadFile = File(...),
    llm_provider: str = "openrouter",
    model_name: str = os.getenv("DEFAULT_MODEL", "google/gemini-flash-1.5"),
    api_key: str = None
):
    """Analyze uploaded financial file and return categorized transactions with insights."""
    
    print(f"📁 Analyzing file: {file.filename}")
    print(f"🔧 Parameters: provider={llm_provider}, model={model_name}, api_key={'provided' if api_key else 'not provided'}")
    
    if not file.filename.endswith(('.csv', '.json')):
        raise HTTPException(status_code=400, detail="Only CSV and JSON files are supported")
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
    
    try:
        # Create analyzer with API key if provided, otherwise use default
        if api_key:
            print(f"🔑 Creating new analyzer with provided API key and model: {model_name}")
            current_analyzer = FinancialAnalyzer(api_key=api_key, model=model_name)
        else:
            print(f"🔄 Using default analyzer")
            current_analyzer = analyzer
        
        # Parse the file and categorize transactions
        if temp_file_path.endswith('.csv'):
            transactions = current_analyzer.parse_csv_file(temp_file_path)
        else:
            transactions = current_analyzer.parse_json_file(temp_file_path)
        
        # Categorize transactions with LLM
        transactions = await current_analyzer.categorize_transactions_with_llm(transactions)
        
        # Generate insights
        insights = current_analyzer.generate_insights(transactions)
        
        # Generate LLM-based suggestions
        suggestions = await current_analyzer.generate_suggestions_with_llm(transactions, insights)
        
        # Format response for frontend
        response = {
            "transactions": [
                {
                    "date": t.date,
                    "description": t.description,
                    "amount": t.amount,
                    "category": t.category,
                    "type": t.type,
                    "confidence": t.confidence
                }
                for t in transactions
            ],
            "insights": insights,
            "suggestions": suggestions,
            "summary": {
                "total_transactions": len(transactions),
                "total_income": sum(t.amount for t in transactions if t.type == "income"),
                "total_expenses": abs(sum(t.amount for t in transactions if t.type == "expense")),
                "categories": list(set(t.category for t in transactions)),
                "high_confidence_count": len([t for t in transactions if t.confidence > 0.8]),
                "low_confidence_count": len([t for t in transactions if t.confidence < 0.6])
            }
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

@app.post("/api/analyze/stream")
async def analyze_file_stream(
    file: UploadFile = File(...),
    llm_provider: str = "openrouter",
    model_name: str = os.getenv("DEFAULT_MODEL", "google/gemini-flash-1.5"),
    api_key: str = None
):
    """Stream analysis results in real-time using Server-Sent Events."""
    
    print(f"📁 Starting streaming analysis for: {file.filename}")
    print(f"🔧 Stream parameters: provider={llm_provider}, model={model_name}")
    
    if not file.filename.endswith(('.csv', '.json')):
        raise HTTPException(status_code=400, detail="Only CSV and JSON files are supported")
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
    
    async def stream_analysis():
        try:
            # Create analyzer with API key if provided, otherwise use default
            if api_key:
                print(f"🔑 Creating streaming analyzer with provided API key")
                current_analyzer = FinancialAnalyzer(api_key=api_key, model=model_name)
            else:
                print(f"🔄 Using default analyzer for streaming")
                current_analyzer = analyzer
            
            # Parse the file first
            if temp_file_path.endswith('.csv'):
                transactions = current_analyzer.parse_csv_file(temp_file_path)
            else:
                transactions = current_analyzer.parse_json_file(temp_file_path)
            
            print(f"📊 Parsed {len(transactions)} transactions, starting stream...")
            
            # Send initial event with file info
            initial_data = {
                'total_transactions': len(transactions),
                'filename': file.filename
            }
            yield f"event: analysis_started\ndata: {json.dumps(initial_data)}\n\n"
            
            # Stream categorized transactions
            async for batch_result in current_analyzer.categorize_transactions_streaming(transactions):
                event_type = batch_result.get("event", "batch_complete")
                
                # Remove the 'event' key from data since we're using it in the SSE format
                data = {k: v for k, v in batch_result.items() if k != "event"}
                
                yield f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
            
            # Generate final suggestions with LLM
            print("🔮 Generating AI-powered suggestions...")
            final_insights = current_analyzer.generate_insights(transactions)
            suggestions = await current_analyzer.generate_suggestions_with_llm(transactions, final_insights)
            
            # Send suggestions event
            suggestions_data = {
                'suggestions': suggestions,
                'suggestions_count': len(suggestions)
            }
            yield f"event: suggestions_generated\ndata: {json.dumps(suggestions_data)}\n\n"
            
            # Send completion event
            print(f"✅ Streaming analysis completed for {file.filename}")
            yield f"event: analysis_complete\ndata: {json.dumps({'message': 'Analysis completed successfully'})}\n\n"
            
        except Exception as e:
            print(f"❌ Streaming analysis error: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    return StreamingResponse(
        stream_analysis(),
        media_type="text/plain",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.get("/api/models")
async def get_available_models():
    """Get list of available models with pricing information."""
    # Return a simplified list of popular models since we don't have the MCP method
    models = [
        {"name": "openai/gpt-4o-mini", "provider": "openrouter", "cost": "$0.15/1M tokens"},
        {"name": "anthropic/claude-3-haiku", "provider": "openrouter", "cost": "$0.25/1M tokens"},
        {"name": "google/gemini-flash-1.5", "provider": "openrouter", "cost": "$0.075/1M tokens"},
        {"name": "anthropic/claude-3-5-sonnet", "provider": "openrouter", "cost": "$3/1M tokens"},
        {"name": "openai/gpt-4-turbo", "provider": "openrouter", "cost": "$10/1M tokens"}
    ]
    return {"models": models}

@app.get("/api/config/status")
async def get_config_status():
    """Get current configuration status."""
    has_openrouter = bool(os.getenv('OPENROUTER_API_KEY'))
    has_openai = bool(os.getenv('OPENAI_API_KEY'))
    
    return {
        "openrouter_configured": has_openrouter,
        "openai_configured": has_openai,
        "llm_available": analyzer.openai_client is not None,
        "current_model": analyzer.model if analyzer.openai_client else None,
        "current_provider": "openrouter" if has_openrouter else "openai" if has_openai else None,
        "environment": {
            "default_model": os.getenv('DEFAULT_MODEL', 'google/gemini-flash-1.5'),
            "base_url": os.getenv('BASE_URL', 'https://openrouter.ai/api/v1'),
            "default_model_from_env": bool(os.getenv('DEFAULT_MODEL')),
            "base_url_from_env": bool(os.getenv('BASE_URL'))
        }
    }

@app.post("/api/configure")
async def configure_llm_endpoint(
    llm_provider: str,
    model_name: str,
    api_key: str
):
    """Configure LLM provider and model."""
    try:
        # Create a new analyzer with the provided configuration
        base_url = "https://openrouter.ai/api/v1" if llm_provider == "openrouter" else "https://api.openai.com/v1"
        global analyzer
        analyzer = FinancialAnalyzer(api_key=api_key, base_url=base_url, model=model_name)
        
        return {
            "message": "LLM configured successfully", 
            "provider": llm_provider, 
            "model": model_name,
            "base_url": base_url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Configuration failed: {str(e)}")

# Serve React static files
try:
    app.mount("/static", StaticFiles(directory="frontend/dist"), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Serve React app for all non-API routes."""
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse("frontend/dist/index.html")
except Exception:
    # Frontend not built yet
    pass

@app.get("/")
async def read_root():
    """Serve React app (placeholder until build exists)."""
    return {"message": "Financial Analyzer API", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
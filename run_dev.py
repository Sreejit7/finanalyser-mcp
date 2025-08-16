#!/usr/bin/env python3
"""
Development runner for Financial Analyzer web application.
Starts both FastAPI backend and React frontend in development mode.
"""

import subprocess
import sys
import os
import signal
import time
from pathlib import Path

def main():
    """Run both backend and frontend in development mode."""
    
    # Change to project root
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    print("🚀 Starting Financial Analyzer Development Server...")
    print("=" * 50)
    
    # Start FastAPI backend
    print("📡 Starting FastAPI backend on http://localhost:8000...")
    backend_process = subprocess.Popen([
        sys.executable, "-m", "uvicorn", "web_api:app", 
        "--reload", "--host", "0.0.0.0", "--port", "8000"
    ])
    
    # Wait a moment for backend to start
    time.sleep(2)
    
    # Start React frontend
    print("⚛️  Starting React frontend on http://localhost:3000...")
    frontend_process = subprocess.Popen([
        "bun", "run", "dev"
    ], cwd="frontend")
    
    print("\n✅ Both servers are starting up!")
    print("📡 FastAPI Backend: http://localhost:8000")
    print("📡 API Documentation: http://localhost:8000/docs")
    print("⚛️  React Frontend: http://localhost:3000")
    print("\n🔧 Press Ctrl+C to stop both servers")
    print("=" * 50)
    
    try:
        # Wait for processes
        backend_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
        
        # Terminate both processes
        backend_process.terminate()
        frontend_process.terminate()
        
        # Wait for clean shutdown
        backend_process.wait()
        frontend_process.wait()
        
        print("✅ Servers stopped successfully!")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Production build script for Financial Analyzer web application.
Builds the React frontend and configures FastAPI to serve it.
"""

import subprocess
import sys
import os
from pathlib import Path

def main():
    """Build the React frontend for production."""
    
    # Change to project root
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    print("🏗️  Building Financial Analyzer for Production...")
    print("=" * 50)
    
    # Build React frontend
    print("⚛️  Building React frontend...")
    frontend_dir = project_root / "frontend"
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found!")
        return 1
    
    # Install dependencies if needed
    print("📦 Installing frontend dependencies...")
    subprocess.run(["bun", "install"], cwd=frontend_dir, check=True)
    
    # Build the frontend
    print("🔨 Building frontend...")
    result = subprocess.run(["bun", "run", "build"], cwd=frontend_dir)
    
    if result.returncode != 0:
        print("❌ Frontend build failed!")
        return 1
    
    # Check if dist directory was created
    dist_dir = frontend_dir / "dist"
    if not dist_dir.exists():
        print("❌ Build output directory not found!")
        return 1
    
    print("✅ Frontend built successfully!")
    print(f"📁 Build output: {dist_dir}")
    print("\n🚀 To run the production server:")
    print("   python -m uvicorn web_api:app --host 0.0.0.0 --port 8000")
    print("   Then visit: http://localhost:8000")
    print("=" * 50)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
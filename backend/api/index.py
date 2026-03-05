"""
Vercel entry point for the FastAPI backend.
Adds the backend directory to sys.path so all flat imports work.
"""
import sys
import os

# When deployed to Vercel, this file is at /var/task/api/index.py
# The backend/ root is one level up
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from main import app  # noqa: E402
except Exception as e:
    # Surface import errors clearly in Vercel logs
    import traceback
    from fastapi import FastAPI
    app = FastAPI()

    @app.get("/{path:path}")
    def error_handler(path: str = ""):
        return {
            "error": "Failed to import application",
            "detail": str(e),
            "traceback": traceback.format_exc()
        }

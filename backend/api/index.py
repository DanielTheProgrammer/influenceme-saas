"""
Vercel entry point for the FastAPI backend.
Adds the backend directory to sys.path so all flat imports work.
"""
import sys
import os

# When deployed to Vercel, this file is at /var/task/api/index.py
# The backend/ root is one level up
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app  # noqa: E402 — must come after sys.path manipulation

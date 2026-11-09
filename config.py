import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the current project directory
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# Groq API Key
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

# Supported Groq Models
SUPPORTED_MODELS = [
    {
        "id": "llama-3.3-70b-versatile",
        "name": "Llama 3.3 70B (Versatile)",
        "description": "Recommended. Most capable reasoning, coding, and general intelligence.",
        "context_window": 128000,
        "default": True
    },
    {
        "id": "llama-3.1-8b-instant",
        "name": "Llama 3.1 8B (Instant)",
        "description": "Blazing fast response times, ideal for quick queries and chat.",
        "context_window": 128000,
        "default": False
    },
    {
        "id": "mixtral-8x7b-32768",
        "name": "Mixtral 8x7B (32k)",
        "description": "Solid Mixture-of-Experts model with 32k context.",
        "context_window": 32768,
        "default": False
    },
    {
        "id": "gemma2-9b-it",
        "name": "Gemma 2 9B (Instruct)",
        "description": "Google's lightweight, high-performance open model.",
        "context_window": 8192,
        "default": False
    }
]

DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "llama-3.3-70b-versatile")
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))


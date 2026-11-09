@echo off
title Groq Personal Assistant
echo ========================================================
echo         Launching Groq Personal Assistant (Aura)
echo ========================================================
echo.

IF NOT EXIST "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found.
    echo Please make sure the venv is created.
    pause
    exit /b
)

echo Starting FastAPI server at http://127.0.0.1:8000 ...
echo Press Ctrl+C in this terminal to stop the server.
echo.

.\venv\Scripts\python.exe app.py
pause


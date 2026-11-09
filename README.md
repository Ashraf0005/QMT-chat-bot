# Aura — Groq AI Personal Assistant

A modern, high-performance, Python-based Personal AI Assistant powered by **Groq's ultra-low-latency LPU™ inference engine**. Features a clean, responsive HTML/CSS/JS chat interface, Server-Sent Events (SSE) token streaming, multiple persona presets, customizable system prompts, and conversation history.

---

## 🌟 Key Features

1. **Ultra-Fast Streaming**: Real-time word-by-word streaming responses using Server-Sent Events (SSE) and Groq's high-speed inference (up to 500+ tokens/sec).
2. **Proper System Prompts & Personas**:
   - **Elite Executive Assistant** *(Default)*: Proactive, strategic, structured daily planning, task prioritization, and decision support.
   - **Senior Tech Architect**: Deep engineering analysis, system design, and production-grade code.
   - **Ultra-Concise Advisor**: High-efficiency, zero fluff, straight to the point.
   - **Creative Strategist & Writer**: Copywriting, storytelling, brainstorming, and persuasive communication.
   - **Socratic Mentor**: Intuitive explanations, analogies, and educational guidance.
   - **Custom Persona**: Live in-browser system prompt editor to tailor the assistant's behavior on the fly.
3. **Modern Chat UI**:
   - Clean dark/light theme with glassmorphic cards and polished typography.
   - Rich Markdown rendering (headers, bolding, lists, blockquotes, tables).
   - Code blocks with syntax highlighting and one-click **Copy code** button.
   - Auto-growing multiline input (Enter to send, Shift + Enter for new lines).
   - Dynamic **Stop Generation** button to abort streaming at any time.
   - Conversation management: Multi-chat history saved locally, rename, delete, clear, and **Export to Markdown**.
   - Groq API Key configuration in either `.env` or the in-app **Settings Modal** (with a "Test Connection" button).

---

## 🚀 Quickstart

### 1. Configure Your Groq API Key
You can set your Groq API key in either of two ways:

#### Option A: In the `.env` file (Recommended)
Open the `.env` file in this directory and paste your Groq API key:
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```
*(Get a free key from [Groq Console](https://console.groq.com/keys))*

#### Option B: Directly in the Web UI
Leave `.env` empty. When you open the web UI, click the **Settings ⚙️** icon in the bottom-left of the sidebar, enter your API key, click **Test Connection**, and click **Save Settings**. It will be saved securely in your browser's local storage.

---

### 2. Run the Assistant

#### On Windows (Single Click)
Double-click `run.bat` or run:
```cmd
run.bat
```

#### Or using the command line:
```bash
.\venv\Scripts\python.exe app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 📁 Project Architecture

```
QMT chat bot/
├── app.py              # FastAPI web server, SSE streaming endpoint & API key validation
├── config.py           # Model definitions, environment loading, and defaults
├── prompts.py          # Curated system prompt presets and persona definitions
├── requirements.txt    # Python dependencies (fastapi, groq, uvicorn, python-dotenv)
├── run.bat             # 1-click Windows launcher
├── .env.example        # Environment variables template
├── .env                # Local secrets configuration (put GROQ_API_KEY here)
└── static/
    ├── index.html      # Responsive chat interface with sidebar and modal
    ├── style.css       # Dark/Light theme styling, markdown formatting, animations
    └── script.js       # Client engine (SSE streaming reader, state, conversation history)
```

---

## 🤖 Supported Models

| Model ID | Context Window | Description |
|---|---|---|
| `llama-3.3-70b-versatile` *(Default)* | 128k | Most capable reasoning, analysis, and coding intelligence. |
| `llama-3.1-8b-instant` | 128k | Extremely fast inference for everyday queries. |
| `mixtral-8x7b-32768` | 32k | Powerful Mixture-of-Experts model. |
| `gemma2-9b-it` | 8k | Google Gemma 2 instruct model on Groq. |

---

## 🛠️ Customizing System Prompts

To adjust or add new personas permanently, edit [`prompts.py`](file:///e:/QMT%20PROJECT/QMT%20chat%20bot/prompts.py):
```python
PERSONA_PRESETS["my_custom_persona"] = {
    "name": "My Custom Persona",
    "description": "Custom instructions for special tasks",
    "prompt": "You are a specialized AI assistant that..."
}
```
Any changes are instantly reflected in the application.


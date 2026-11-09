# Aura — Groq AI Personal Assistant with Tavily Web Search

A modern, high-performance, Python-based Personal AI Assistant powered by **Groq's ultra-low-latency LPU™ inference engine** and **Tavily AI Search Engine** for real-time web grounding. Features a clean, responsive HTML/CSS/JS chat interface, Server-Sent Events (SSE) token streaming, multiple persona presets, customizable system prompts, web search citations, and conversation history.

---

## 🌟 Key Features

1. **Ultra-Fast Streaming**: Real-time word-by-word streaming responses using Server-Sent Events (SSE) and Groq's high-speed inference (up to 500+ tokens/sec).
2. **Real-Time Web Search (Powered by Tavily)**:
   - One-click **Web Search** toggle in the chat interface.
   - Real-time search status animation and live indicator.
   - Rich interactive web source citation pills with domain titles and direct links.
   - Context injection into the LLM prompt with inline citation instructions.
3. **Proper System Prompts & Personas**:
   - **Elite Executive Assistant** *(Default)*: Proactive, strategic, structured daily planning, task prioritization, and decision support.
   - **Senior Tech Architect**: Deep engineering analysis, system design, and production-grade code.
   - **Ultra-Concise Advisor**: High-efficiency, zero fluff, straight to the point.
   - **Creative Strategist & Writer**: Copywriting, storytelling, brainstorming, and persuasive communication.
   - **Socratic Mentor**: Intuitive explanations, analogies, and educational guidance.
   - **Custom Persona**: Live in-browser system prompt editor to tailor the assistant's behavior on the fly.
4. **Modern Chat UI**:
   - Clean dark/light theme with glassmorphic cards and polished typography.
   - Rich Markdown rendering (headers, bolding, lists, blockquotes, tables).
   - Code blocks with syntax highlighting and one-click **Copy code** button.
   - Auto-growing multiline input (Enter to send, Shift + Enter for new lines).
   - Dynamic **Stop Generation** button to abort streaming at any time.
   - Conversation management: Multi-chat history saved locally, rename, delete, clear, and **Export to Markdown**.
   - API Key configuration in either `.env` or the in-app **Settings Modal** with test buttons for both **Groq** and **Tavily**.

---

## 🚀 Quickstart

### 1. Configure Your API Keys

You can configure your keys in either of two ways:

#### Option A: In the `.env` file (Recommended)
Open `.env` in this directory and configure your keys:
```env
# Groq API Key (https://console.groq.com/keys)
GROQ_API_KEY=gsk_your_actual_groq_api_key_here

# Tavily Web Search API Key (https://app.tavily.com - 1,000 free searches/month)
TAVILY_API_KEY=tvly-your_actual_tavily_api_key_here
```

#### Option B: Directly in the Web UI
Open the web UI, click the **Settings ⚙️** icon in the bottom-left of the sidebar, enter your Groq and/or Tavily keys, test connections, and click **Save Settings**. Keys are stored safely in your browser's local storage.

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
├── app.py              # FastAPI server, SSE streaming endpoint, web search & key validation
├── config.py           # Model definitions, environment loading, and defaults
├── prompts.py          # Curated system prompt presets and persona definitions
├── tavily_service.py   # Asynchronous Tavily search client & prompt context formatter
├── requirements.txt    # Python dependencies (fastapi, groq, tavily-python, uvicorn, python-dotenv)
├── run.bat             # 1-click Windows launcher
├── .env.example        # Environment variables template
├── .env                # Local secrets configuration (GROQ_API_KEY, TAVILY_API_KEY)
└── static/
    ├── index.html      # Responsive chat interface with sidebar, search toggle, and modal
    ├── style.css       # Dark/Light theme styling, search status bars, citation pills
    └── script.js       # Client engine (SSE streaming, web search toggle, history)
```

---

## 🤖 Supported Models

| Model ID | Context Window | Description |
|---|---|---|
| `llama-3.3-70b-versatile` *(Default)* | 128k | Most capable reasoning, analysis, and coding intelligence. |
| `llama-3.1-8b-instant` | 128k | Extremely fast inference for everyday queries. |
| `mixtral-8x7b-32768` | 32k | Powerful Mixture-of-Experts model. |
| `openai/gpt-oss-120b` | 8k | High-performance open model. |

---

## 🛠️ Customizing System Prompts

To adjust or add new personas permanently, edit [`prompts.py`](file:///e:/QMT%20PROJECT/New%20folder/QMT-chat-bot/prompts.py):
```python
PERSONA_PRESETS["my_custom_persona"] = {
    "name": "My Custom Persona",
    "description": "Custom instructions for special tasks",
    "prompt": "You are a specialized AI assistant that..."
}
```
Any changes are instantly reflected in the application.

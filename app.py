import json
import logging
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from groq import AsyncGroq, GroqError

from config import (
    GROQ_API_KEY,
    TAVILY_API_KEY,
    SUPPORTED_MODELS,
    DEFAULT_MODEL,
    HOST,
    PORT,
)
from prompts import DEFAULT_SYSTEM_PROMPT, PERSONA_PRESETS, inject_temporal_context
from tavily_service import (
    search_tavily,
    validate_tavily_key,
    format_search_context,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("groq_assistant")

app = FastAPI(title="Groq Personal Assistant with Tavily Search", version="1.1.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class MessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[MessageItem]
    model: Optional[str] = DEFAULT_MODEL
    system_prompt: Optional[str] = None
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(4096, ge=1, le=8192)
    api_key: Optional[str] = None
    web_search: Optional[bool] = False
    tavily_api_key: Optional[str] = None


class ValidateKeyRequest(BaseModel):
    api_key: str


class ValidateTavilyKeyRequest(BaseModel):
    api_key: str


class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 5
    search_depth: Optional[str] = "basic"
    api_key: Optional[str] = None


@app.get("/")
async def serve_index():
    index_file = STATIC_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="index.html not found")
    return FileResponse(index_file)


@app.get("/api/config")
async def get_config():
    """Returns server configuration, available models, system prompt presets, and key status."""
    server_has_groq = bool(GROQ_API_KEY and not GROQ_API_KEY.startswith("gsk_your_groq"))
    server_has_tavily = bool(TAVILY_API_KEY and not TAVILY_API_KEY.startswith("tvly-your_tavily"))
    return {
        "has_server_api_key": server_has_groq,
        "has_server_tavily_key": server_has_tavily,
        "default_model": DEFAULT_MODEL,
        "models": SUPPORTED_MODELS,
        "personas": PERSONA_PRESETS,
        "default_system_prompt": DEFAULT_SYSTEM_PROMPT,
    }


@app.post("/api/validate-key")
async def validate_key(req: ValidateKeyRequest):
    """Validate a user-supplied Groq API key by querying available models."""
    key = req.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key is empty")
    try:
        client = AsyncGroq(api_key=key)
        await client.models.list()
        return {"valid": True, "message": "Groq API key verified successfully!"}
    except Exception as e:
        logger.warning(f"Groq key validation failed: {e}")
        return JSONResponse(
            status_code=400,
            content={"valid": False, "message": str(e)}
        )


@app.post("/api/validate-tavily-key")
async def validate_tavily_key_endpoint(req: ValidateTavilyKeyRequest):
    """Validate a user-supplied Tavily Search API key."""
    result = await validate_tavily_key(req.api_key)
    if result.get("valid"):
        return result
    return JSONResponse(status_code=400, content=result)


@app.post("/api/search")
async def direct_search(req: SearchRequest):
    """Direct web search endpoint using Tavily."""
    active_tavily_key = req.api_key.strip() if req.api_key and req.api_key.strip() else TAVILY_API_KEY
    if not active_tavily_key or active_tavily_key.startswith("tvly-your_tavily"):
        raise HTTPException(
            status_code=401,
            detail="No valid Tavily API key configured. Provide it in the request or set TAVILY_API_KEY in .env."
        )

    results = await search_tavily(
        query=req.query,
        api_key=active_tavily_key,
        max_results=req.max_results or 5,
        search_depth=req.search_depth or "basic"
    )
    return results


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """Streams chat completion response from Groq via Server-Sent Events (SSE) with optional Tavily web search."""
    # 1. Determine active Groq API key
    active_groq_key = req.api_key.strip() if req.api_key and req.api_key.strip() else GROQ_API_KEY
    if not active_groq_key or active_groq_key.startswith("gsk_your_groq"):
        raise HTTPException(
            status_code=401,
            detail="No valid Groq API key provided. Please configure GROQ_API_KEY in .env or provide it in the UI Settings."
        )

    # 2. Build base messages array with system prompt and dynamic temporal context
    formatted_messages = []
    effective_system_prompt = req.system_prompt if req.system_prompt and req.system_prompt.strip() else DEFAULT_SYSTEM_PROMPT
    effective_system_prompt = inject_temporal_context(effective_system_prompt)

    # Add system prompt as the first message
    formatted_messages.append({
        "role": "system",
        "content": effective_system_prompt
    })

    # Append user and assistant history
    for msg in req.messages:
        if msg.role != "system":
            formatted_messages.append({"role": msg.role, "content": msg.content})

    model_to_use = req.model or DEFAULT_MODEL
    temperature = req.temperature if req.temperature is not None else 0.7
    max_tokens = req.max_tokens or 4096
    web_search_enabled = bool(req.web_search)

    # Active Tavily key resolution
    active_tavily_key = req.tavily_api_key.strip() if req.tavily_api_key and req.tavily_api_key.strip() else TAVILY_API_KEY

    async def event_generator():
        # Handle Web Search if requested
        if web_search_enabled:
            if not active_tavily_key or active_tavily_key.startswith("tvly-your_tavily"):
                err_payload = json.dumps({
                    "error": "Web search is enabled, but no valid Tavily API key was found. Please add your Tavily API key in Settings (⚙️) or in the .env file."
                })
                yield f"data: {err_payload}\n\n"
                return

            # Find the latest user query
            user_query = ""
            for msg in reversed(req.messages):
                if msg.role == "user" and msg.content:
                    user_query = msg.content
                    break

            if user_query:
                # Notify client that web search is underway
                yield f"data: {json.dumps({'type': 'search_start', 'query': user_query})}\n\n"

                # Execute search via Tavily
                search_data = await search_tavily(
                    query=user_query,
                    api_key=active_tavily_key,
                    max_results=5,
                    search_depth="basic"
                )

                # Send search results & sources to client
                yield f"data: {json.dumps({'type': 'search_results', 'query': user_query, 'results': search_data.get('results', []), 'answer': search_data.get('answer', ''), 'success': search_data.get('success', False), 'error': search_data.get('error')})}\n\n"

                # Inject formatted search context into prompt
                search_context = format_search_context(search_data)
                if formatted_messages and formatted_messages[-1]["role"] == "user":
                    formatted_messages[-1]["content"] = f"{formatted_messages[-1]['content']}\n\n{search_context}"
                else:
                    formatted_messages.append({"role": "system", "content": search_context})

        # Initialize Groq client and stream completions
        client = AsyncGroq(api_key=active_groq_key)
        try:
            stream = await client.chat.completions.create(
                model=model_to_use,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    payload = json.dumps({"content": delta})
                    yield f"data: {payload}\n\n"

            # Completion marker
            yield "data: [DONE]\n\n"

        except GroqError as ge:
            logger.error(f"Groq API error: {ge}")
            err_payload = json.dumps({"error": f"Groq API Error: {str(ge)}"})
            yield f"data: {err_payload}\n\n"
        except Exception as e:
            logger.exception("Unexpected error in chat_stream")
            err_payload = json.dumps({"error": f"Server Error: {str(e)}"})
            yield f"data: {err_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


if __name__ == "__main__":
    import uvicorn
    print(f"\n==========================================")
    print(f" Groq + Tavily Assistant Server Starting ")
    print(f" URL: http://{HOST}:{PORT}")
    print(f"==========================================\n")
    uvicorn.run("app:app", host=HOST, port=PORT, reload=True)

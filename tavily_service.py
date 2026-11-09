"""
Tavily Web Search Integration Service for Groq Assistant.
Provides asynchronous search capabilities and context formatting for LLM augmentation.
"""

import logging
from typing import Dict, Any, List, Optional
from tavily import AsyncTavilyClient, InvalidAPIKeyError, UsageLimitExceededError

logger = logging.getLogger("groq_assistant.tavily")


async def validate_tavily_key(api_key: str) -> Dict[str, Any]:
    """
    Validate a Tavily API key by running a lightweight query.
    """
    key = api_key.strip()
    if not key:
        return {"valid": False, "message": "Tavily API key cannot be empty."}

    try:
        client = AsyncTavilyClient(api_key=key)
        # Run a minimal search to verify the key
        await client.search(query="test", max_results=1, search_depth="basic")
        return {"valid": True, "message": "Tavily API key verified successfully!"}
    except InvalidAPIKeyError:
        return {"valid": False, "message": "Invalid Tavily API key. Please check your credentials."}
    except UsageLimitExceededError:
        return {"valid": False, "message": "Tavily monthly search limit exceeded for this key."}
    except Exception as e:
        logger.warning(f"Tavily key validation error: {e}")
        return {"valid": False, "message": f"Tavily validation error: {str(e)}"}


async def search_tavily(
    query: str,
    api_key: str,
    max_results: int = 5,
    search_depth: str = "basic"
) -> Dict[str, Any]:
    """
    Perform an asynchronous web search using Tavily.
    
    Returns a dictionary with query, answer, and a structured list of results.
    """
    clean_key = api_key.strip()
    if not clean_key:
        return {
            "success": False,
            "error": "No Tavily API key provided.",
            "query": query,
            "results": []
        }

    try:
        logger.info(f"Executing Tavily search for query: '{query}' (depth={search_depth}, max={max_results})")
        client = AsyncTavilyClient(api_key=clean_key)
        response = await client.search(
            query=query,
            search_depth=search_depth,
            max_results=max_results,
            include_answer=True,
        )

        results = []
        for item in response.get("results", []):
            results.append({
                "title": item.get("title", "Untitled Source"),
                "url": item.get("url", ""),
                "content": item.get("content", ""),
                "score": item.get("score", 0.0),
            })

        return {
            "success": True,
            "query": query,
            "answer": response.get("answer", "") or "",
            "results": results,
            "images": response.get("images", []),
        }

    except InvalidAPIKeyError:
        logger.error("Tavily search failed: Invalid API key")
        return {
            "success": False,
            "error": "Invalid Tavily API key. Please update it in Settings or your .env file.",
            "query": query,
            "results": []
        }
    except UsageLimitExceededError:
        logger.error("Tavily search failed: Usage limit reached")
        return {
            "success": False,
            "error": "Tavily API search quota exceeded.",
            "query": query,
            "results": []
        }
    except Exception as e:
        logger.exception("Unexpected error during Tavily search")
        return {
            "success": False,
            "error": f"Web search error: {str(e)}",
            "query": query,
            "results": []
        }


def format_search_context(search_data: Dict[str, Any]) -> str:
    """
    Transforms Tavily search output into a clear, structured Markdown context
    suitable for injection into the Groq LLM prompt.
    """
    if not search_data.get("success"):
        error_msg = search_data.get("error", "Unknown search error")
        return f"\n\n[System Note: Web search was attempted for '{search_data.get('query', '')}' but encountered an issue: {error_msg}]\n"

    results = search_data.get("results", [])
    if not results:
        return f"\n\n[System Note: Web search for '{search_data.get('query', '')}' returned no results.]\n"

    lines = [
        "\n### 🌐 Real-Time Web Search Results (via Tavily):",
        f"**Search Query:** \"{search_data.get('query', '')}\"",
    ]

    answer = search_data.get("answer")
    if answer:
        lines.append(f"\n**Tavily Quick Summary:**\n{answer}\n")

    lines.append("\n**Top Web Sources:**")
    for idx, item in enumerate(results, 1):
        title = item.get("title") or f"Source {idx}"
        url = item.get("url") or "#"
        content = item.get("content", "").strip()
        lines.append(f"{idx}. [{title}]({url})")
        if content:
            lines.append(f"   *Excerpt:* {content}")

    lines.append(
        "\n**Instructions for Response:**\n"
        "- Synthesize and prioritize the real-time search findings above to answer the user's inquiry.\n"
        "- Cite relevant sources inline using standard Markdown links, e.g. `[Source Title](URL)`.\n"
        "- If the search results do not fully address the user query, state what is known and clarify any gaps."
    )

    return "\n".join(lines)


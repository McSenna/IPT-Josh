import os

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
ALLOWED_MODEL_NAME = "sciefy"
LOCAL_API_TOKEN = os.getenv("LOCAL_API_TOKEN")

app = FastAPI(title="Local Chat Backend", version="1.0.0")

# Restrictive CORS: allow only local frontends (common dev ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost",
        "http://127.0.0.1",
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str
    messages: list[Message]
    stream: bool | None = True


async def get_ollama_response(data: dict):
    """
    Open a streaming connection to Ollama and relay chunks immediately
    to the client as server‑sent events.
    """
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", OLLAMA_CHAT_URL, json=data) as r:
            async for line in r.aiter_lines():
                if not line:
                    continue
                yield f"data: {line}\n\n"


@app.get("/")
async def home():
    return {"status": "ok", "model": ALLOWED_MODEL_NAME}


@app.post("/api/chat")
async def chat(
    req: ChatRequest,
    request: Request,
    x_local_token: str | None = Header(default=None, convert_underscores=False),
):
    # Enforce fixed model name
    if req.model != ALLOWED_MODEL_NAME:
        raise HTTPException(status_code=400, detail="Invalid model. Use 'chain'.")

    # Optional local API token validation
    if LOCAL_API_TOKEN is not None:
        if not x_local_token or x_local_token != LOCAL_API_TOKEN:
            raise HTTPException(status_code=401, detail="Invalid or missing token.")

    payload = {
        "model": ALLOWED_MODEL_NAME,
        "messages": [
            {"role": m.role, "content": m.content}
            for m in req.messages
        ],
        "stream": True,  # always stream from Ollama
    }

    return StreamingResponse(
        get_ollama_response(payload),
        media_type="text/event-stream",
    )
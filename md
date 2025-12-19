Local ChatGPT-Style Web Application Using Ollama

(Custom Model – Local Execution Only)

1. Project Overview

This project requires the development of a ChatGPT-style conversational web application that runs entirely on a local machine using Ollama as the local large language model (LLM) engine.

A pre-existing custom Ollama model has already been created and must be used exactly as provided.
Students are not allowed to call base models directly or modify the custom model.

The system architecture must consist of:

A secure Python backend acting as a proxy to Ollama

A streaming frontend UI that mimics ChatGPT’s real-time response behavior

Local-only execution with no cloud services or external APIs

2. Project Objectives

By completing this project, you will demonstrate the ability to:

Integrate an existing custom Ollama model

Build a secure backend proxy that prevents direct browser access to Ollama

Implement token-level streaming responses

Maintain multi-turn conversational context

Design a responsive frontend with progressive text rendering

Enforce local security controls (CORS and optional token authentication)

3. System Architecture
Browser (Frontend)
   ↓
FastAPI Backend (Local Proxy)
   ↓
Ollama Local API (localhost:11434)
   ↓
Custom Ollama Model

Architectural Rules

The browser must never communicate directly with Ollama

All model requests must pass through the backend

The backend must forward streaming responses without modification

4. Ollama Model Usage
4.1 Model Constraints

✔ You must use the provided custom model name

❌ Base models (e.g., llama3, mistral) must not be referenced directly

❌ Model modification is strictly prohibited

✔ The model name must be referenced exactly in backend requests

Example:

"model": "provided-custom-model"

5. Python Backend Requirements
5.1 Backend Responsibilities

The backend acts as a secure local proxy and must:

Receive chat requests from the frontend

Forward requests to the Ollama local API

Enable and relay streaming responses

Enforce CORS restrictions

Optionally validate a local access token

Prevent direct browser access to Ollama (localhost:11434)

5.2 Technology Stack

Language: Python 3.10+

Framework: FastAPI (required / strongly recommended)

Server: Uvicorn

HTTP Client: httpx or requests (streaming-capable)

5.3 API Endpoint Specification
Endpoint
POST /api/chat

Request Body
{
  "model": "provided-custom-model",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi!" }
  ],
  "stream": true
}

Backend Behavior

Validate model name

Forward request to Ollama

Stream response immediately to the client

5.4 Ollama Forwarding Rules

The backend must forward requests to:

http://localhost:11434/api/chat

Forwarding Rules

Streaming must be enabled

Responses must not be buffered

Tokens must be relayed as they arrive

No response rewriting or post-processing

5.5 Streaming Behavior

Stream tokens incrementally

Forward chunks immediately to the frontend

Close the stream cleanly when generation ends

Handle client disconnects safely

5.6 Security Requirements

Enforce CORS (allowed origins only)

Optionally require a local API token

Ollama must never be exposed to the browser

Reject requests with invalid model names

6. Frontend Requirements
6.1 Technology Stack

Vanilla HTML, CSS, and JavaScript

No frontend frameworks required

Fetch API or EventStream-based streaming

6.2 User Interface Requirements

The UI must include:

Chat message list (user & assistant)

Text input field

Send button and/or Enter-to-send

Streaming or typing indicator

Scrollable chat area

6.3 Conversation State Management

The frontend must maintain a persistent conversation history:

[
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hi!" }
]


Entire conversation history is sent on each request

Enables multi-turn context awareness

6.4 Streaming Interaction Flow

User submits a message

Message is appended to conversation state

Full conversation is sent to /api/chat

Streaming connection opens

Empty assistant message is created

Tokens are appended chunk-by-chunk

Stream closes cleanly after completion

6.5 Required UI Behavior

Progressive text rendering (typing effect)

No UI freezing or blocking

Automatic scroll to latest message

Proper handling of stream termination and errors

7. Installation & Execution Documentation

The project must include clear instructions for:

Installing Python dependencies

Running Ollama locally

Starting the FastAPI backend

Launching the frontend

Verifying streaming functionality

8. Restrictions

❌ No cloud-based APIs
❌ No Docker
❌ No browser-to-Ollama access
❌ No model modification

✔ Local execution only
✔ Custom model usage required

9. Minimum Functional Requirements (Pass Criteria)

✔ Multi-turn conversation support
✔ Streaming responses
✔ Python backend proxy
✔ Streaming frontend UI
✔ Exact custom Ollama model usage
✔ CORS enforcement
✔ Clear setup documentation 
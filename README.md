# Local ChatGPT-Style Web Application Using Ollama

A ChatGPT-style conversational web application that runs entirely locally using Ollama as the LLM engine. This application demonstrates secure backend proxy implementation with real-time streaming responses.

## Project Features

✅ **Multi-turn Conversation Support** - Full conversation history with context awareness
✅ **Real-time Streaming** - Token-by-token progressive text rendering
✅ **Secure Backend Proxy** - FastAPI backend prevents direct browser access to Ollama
✅ **Persistent Chat History** - Conversations saved to browser's localStorage
✅ **Responsive UI** - ChatGPT-like interface with typing indicators and smooth animations
✅ **CORS Security** - Enforced to localhost origins only
✅ **Local Execution Only** - No cloud services or external APIs

## System Architecture

```
Browser (Frontend)
   ↓ (Fetch API with streaming)
FastAPI Backend (Local Proxy)
   ↓ (HTTP forward)
Ollama Local API (localhost:11434)
   ↓
Custom Ollama Model (chain)
```

## Prerequisites

- **Ollama** installed locally (https://ollama.ai)
- **Python 3.10+** installed
- The custom Ollama model `chain` must be created/available

## Installation

### 1. Set Up Python Backend

Navigate to the backend directory:
```bash
cd backend
```

Install Python dependencies:
```bash
pip install -r requirements.txt
```

**Dependencies:**
- `fastapi==0.115.6` - Web framework for the backend proxy
- `uvicorn[standard]==0.34.0` - ASGI server
- `httpx==0.27.2` - Async HTTP client for streaming

### 2. Ensure Ollama Model is Available

Make sure your custom model `chain` is available in Ollama. You can verify this by running:
```bash
ollama list
```

If the model isn't listed, create it using the provided Modelfile:
```bash
ollama create chain -f ./Modelfile
```

### 3. Configure Backend (Optional)

The backend is pre-configured with:
- **Allowed Model**: `sciefy` (enforced server-side)
- **CORS Origins**: `localhost:5173`, `127.0.0.1:5173`, `localhost`, `127.0.0.1`
- **Ollama API URL**: `http://localhost:11434/api/chat`

For optional token-based authentication, set the environment variable:
```bash
export LOCAL_API_TOKEN="your-secret-token"
```

## Running the Application

### Step 1: Start Ollama

Open a terminal and start the Ollama server:
```bash
ollama serve
```

By default, Ollama listens on `http://localhost:11434`

### Step 2: Start the Backend Server

In the backend directory, run:
```bash
uvicorn server:app --host 127.0.0.1 --port 5000 --reload
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:5000
INFO:     Application startup complete
```

The backend will be available at `http://localhost:5000`

### Step 3: Start the Frontend

Open `frontend/index.html` directly in your browser using one of these methods:

**Option A: Simple HTTP Server**
```bash
cd frontend
python -m http.server 8000
# Then visit http://localhost:8000
```

**Option B: Direct File (Simplest)**
Open the file in your browser:
```bash
# macOS
open frontend/index.html

# Windows
start frontend/index.html

# Linux
xdg-open frontend/index.html
```

## Usage

1. **Type a Message** - Enter text in the input field at the bottom
2. **Send Message** - Click "Send" or press `Enter`
   - Use `Shift+Enter` to create new lines
3. **View Response** - Watch the response stream token-by-token in real-time
4. **Continue Conversation** - Full conversation history is maintained automatically
5. **Clear Chat** - Close and reopen the browser tab, or clear localStorage in dev tools

## API Specification

### Endpoint: POST /api/chat

**Request:**
```json
{
  "model": "chain",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ],
  "stream": true
}
```

**Response (Streaming):**
Server-Sent Events (SSE) format:
```
data: {"model":"chain","created_at":"2025-01-01T00:00:00Z","message":{"role":"assistant","content":"T"},"done":false}
data: {"model":"chain","created_at":"2025-01-01T00:00:00Z","message":{"role":"assistant","content":"h"},"done":false}
...
data: {"model":"chain","created_at":"2025-01-01T00:00:00Z","message":{"role":"assistant","content":"!"},"done":true}
```

**Headers (Optional):**
```
x-local-token: <your-token> (if LOCAL_API_TOKEN is set)
```

## Project Structure

```
.
├── backend/
│   ├── Modelfile           # Custom Ollama model definition
│   ├── server.py           # FastAPI backend proxy
│   ├── requirements.txt     # Python dependencies
│   └── __pycache__/         # Python cache (auto-generated)
├── frontend/
│   ├── index.html          # Chat UI structure
│   ├── index.css           # Styling (ChatGPT-like design)
│   ├── chat.js             # Streaming logic and interactions
├── README.md               # This file
└── md                      # Project specification
```

## Key Implementation Details

### Backend (server.py)

- **Framework**: FastAPI with Uvicorn
- **Model Validation**: Enforces use of `chain` model only
- **Streaming**: Uses httpx's async streaming to forward Ollama responses immediately
- **CORS**: Restrictive middleware allows only localhost origins
- **Optional Auth**: Validates `x-local-token` header if environment variable is set
- **Error Handling**: Validates model names and returns appropriate HTTP status codes

### Frontend (chat.js)

- **State Management**: Maintains conversation history in array + localStorage
- **Streaming**: Fetches with streaming response, parses SSE format
- **Progressive Rendering**: Updates DOM as tokens arrive
- **Typing Indicator**: Shows animated dots while waiting for response
- **Keyboard Support**: Enter to send, Shift+Enter for newlines
- **Persistent Storage**: Conversation history survives page reloads

### Styling (index.css)

- **Modern Design**: Gradient backgrounds, smooth animations
- **Responsive**: Works on desktop and mobile
- **Chat UX**: Similar to ChatGPT with user/assistant message differentiation
- **Animations**: Slide-in effects for messages, typing indicator animation
- **Accessibility**: High contrast, readable fonts

## Troubleshooting

### "Invalid model. Use 'chain'." Error
- The backend enforces the `chain` model name strictly
- Verify the model exists: `ollama list`
- Ensure the frontend sends `"model": "chain"` in requests (it does by default)

### "Connection refused" or Timeout
- Ensure Ollama is running: `ollama serve`
- Verify Ollama is on `localhost:11434` (default)
- Check backend is running on `localhost:5000`

### CORS Error in Browser Console
- Verify backend CORS middleware includes your origin
- Currently allows: `localhost`, `127.0.0.1` on ports `5173` and default
- For custom origins, modify `server.py` CORSMiddleware configuration

### No Response from Backend
- Check backend logs for errors
- Verify JSON payload format matches API specification
- Test directly with curl:
  ```bash
  curl -X POST http://localhost:5000/api/chat \
    -H "Content-Type: application/json" \
    -d '{"model":"chain","messages":[{"role":"user","content":"Hello"}],"stream":true}'
  ```

### Conversation History Not Persisting
- Browser localStorage must be enabled
- Check browser DevTools → Application → LocalStorage
- Clear cache/cookies if having issues

## Security Considerations

1. **Ollama Not Exposed** - Browser cannot directly access Ollama (port 11434 blocked)
2. **Model Validation** - Backend rejects requests for any model except `chain`
3. **CORS Enforcement** - Only localhost origins allowed
4. **Optional Token Auth** - Set `LOCAL_API_TOKEN` for additional security
5. **No Sensitive Data** - Conversation history stored locally in browser only

## Performance Notes

- **Streaming Speed** - Depends on Ollama model speed and system resources
- **Memory** - Ollama models typically require 4-8GB+ RAM
- **GPU Acceleration** - Ollama supports CUDA, Metal (macOS), and CPU modes

## Extending the Project

### Add Custom System Prompts
Modify the `SYSTEM` block in `backend/Modelfile` to customize model behavior.

### Add Authentication
Set `LOCAL_API_TOKEN` environment variable to enable token validation in backend.

### Change CORS Origins
Edit `allow_origins` list in `server.py` to add/remove allowed domains.

### Add Message Export
Extend `chat.js` to export conversation history as JSON or markdown.

### Add Multiple Models
Modify backend to accept different models (remove model validation).

## Testing Checklist

- [ ] Ollama server is running
- [ ] Backend server starts without errors
- [ ] Frontend loads in browser
- [ ] Can send a message
- [ ] Response streams token-by-token
- [ ] Multiple turns work with context
- [ ] Conversation persists after page reload
- [ ] Typing indicator appears while waiting
- [ ] Error messages display properly
- [ ] UI is responsive on mobile

## Compliance Notes

✅ Uses custom Ollama model `chain` exclusively  
✅ Backend acts as secure proxy to Ollama  
✅ Implements token-level streaming  
✅ Maintains multi-turn conversation context  
✅ Responsive UI with progressive text rendering  
✅ CORS enforcement implemented  
✅ Local execution only (no cloud services)  
✅ Complete documentation provided  

## License

This project is for educational purposes.

---

**Last Updated**: January 2025  
**Python Version**: 3.10+  
**Ollama Version**: Latest (required for `chain` model support)

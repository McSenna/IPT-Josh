// Global state
let conversationHistory = [];
let isLoading = false;
let authToken = null;

// DOM elements
const chatMessagesDiv = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusDiv = document.getElementById('status');

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const MODEL_NAME = 'sciefy';

/**
 * Get the authentication token
 * Checks multiple sources in order of priority
 */
function getAuthToken() {
    // 1. Check in-memory token (set during session)
    if (authToken) {
        return authToken;
    }

    // 2. Check sessionStorage (cleared when tab closes)
    const sessionToken = sessionStorage.getItem('authToken');
    if (sessionToken) {
        authToken = sessionToken;
        return authToken;
    }

    // 3. Check for token in URL parameters (e.g., ?token=xxx)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
        authToken = urlToken;
        setAuthToken(urlToken); // Save it
        return authToken;
    }

    return null;
}

/**
 * Set and persist the authentication token
 */
function setAuthToken(token) {
    authToken = token;
    sessionStorage.setItem('authToken', token);
    updateStatus('Token set successfully! Ready to chat.', 'success');
    console.log('Authentication token saved');
}

/**
 * Clear the authentication token
 */
function clearAuthToken() {
    authToken = null;
    sessionStorage.removeItem('authToken');
    updateStatus('Token cleared. You can continue chatting if your backend allows it.', '');
    console.log('Authentication token cleared');
}

/**
 * Load conversation history from sessionStorage
 */
function loadConversationHistory() {
    const saved = sessionStorage.getItem('conversationHistory');
    if (saved) {
        try {
            conversationHistory = JSON.parse(saved);
            renderMessages();
        } catch (e) {
            console.error('Failed to load conversation history:', e);
            conversationHistory = [];
        }
    }
}

/**
 * Save conversation history to sessionStorage
 */
function saveConversationHistory() {
    sessionStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
}

/**
 * Clear conversation history
 */
function clearConversation() {
    conversationHistory = [];
    saveConversationHistory();
    chatMessagesDiv.innerHTML = '';
    statusDiv.innerHTML = '';
    messageInput.focus();
    updateStatus('Conversation cleared. Start a new chat!', 'success');
}

/**
 * Render all messages to the DOM
 */
function renderMessages() {
    chatMessagesDiv.innerHTML = '';
    conversationHistory.forEach(msg => {
        appendMessageToDOM(msg.role, msg.content, false);
    });
    scrollToBottom();
}

/**
 * Append a message to the DOM
 */
function appendMessageToDOM(role, content, animate = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(contentDiv);
    chatMessagesDiv.appendChild(messageDiv);

    if (animate) {
        scrollToBottom();
    }
}

/**
 * Create a typing indicator element
 */
function createTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message assistant';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }

    indicator.appendChild(typingDiv);
    return indicator;
}

/**
 * Update status message
 */
function updateStatus(message, type = '') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Auto-clear success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (statusDiv.textContent === message) {
                statusDiv.textContent = '';
                statusDiv.className = 'status';
            }
        }, 3000);
    }
}

/**
 * Scroll chat to bottom
 */
function scrollToBottom() {
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
}

/**
 * Send message to backend and handle streaming response
 */
async function sendMessage() {
    const userMessage = messageInput.value.trim();

    if (!userMessage) {
        updateStatus('Please enter a message', 'error');
        return;
    }

    if (isLoading) {
        updateStatus('Please wait for the current response', 'error');
        return;
    }

    // Get token (optional - will work without it if backend allows)
    const token = getAuthToken();
    
    // Log token status for debugging
    if (!token) {
        console.warn('No authentication token found. Proceeding without token...');
        console.info('To set a token, use one of these methods:');
        console.info('1. URL parameter: ?token=your-token');
        console.info('2. Console: setAuthToken("your-token")');
        console.info('3. sessionStorage.setItem("authToken", "your-token")');
    } else {
        console.log('Using authentication token');
    }

    // Disable input while loading
    isLoading = true;
    messageInput.disabled = true;
    sendButton.disabled = true;
    messageInput.value = '';

    // Add user message to history
    conversationHistory.push({
        role: 'user',
        content: userMessage,
    });

    // Display user message
    appendMessageToDOM('user', userMessage);
    updateStatus('Waiting for response...', 'loading');

    // Add empty assistant message and typing indicator
    conversationHistory.push({
        role: 'assistant',
        content: '',
    });

    const typingIndicator = createTypingIndicator();
    chatMessagesDiv.appendChild(typingIndicator);
    scrollToBottom();

    try {
        // Build request payload
        const payload = {
            model: MODEL_NAME,
            messages: conversationHistory.slice(0, -1),
            stream: true,
        };

        // Build headers with optional authentication
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Add token to headers only if it exists
        if (token) {
            headers['x-local-token'] = token;
        }

        // Fetch with streaming
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.error || errorMessage;
                
                // Handle token-specific errors
                if (response.status === 401 || response.status === 403) {
                    clearAuthToken();
                    errorMessage += '\n\nAuthentication required. Please set a valid token using:\n';
                    errorMessage += '• URL parameter: ?token=your-token\n';
                    errorMessage += '• Console: setAuthToken("your-token")';
                    
                    console.error('Authentication failed. Token may be invalid or expired.');
                    console.info('Set a new token using setAuthToken("your-token")');
                }
            } catch (e) {
                console.error('Failed to parse error response:', e);
            }
            
            throw new Error(errorMessage);
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        let typingRemoved = false;

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6);

                    if (!jsonStr.trim()) continue;

                    try {
                        const data = JSON.parse(jsonStr);

                        if (data.message && data.message.content) {
                            const token = data.message.content;
                            assistantContent += token;

                            // Remove typing indicator on first token
                            if (!typingRemoved) {
                                typingIndicator.remove();
                                typingRemoved = true;
                                appendMessageToDOM('assistant', '', false);
                            }

                            // Update the last message content
                            const lastMessage = chatMessagesDiv.lastElementChild;
                            if (lastMessage && lastMessage.classList.contains('assistant')) {
                                lastMessage.querySelector('.message-content').textContent =
                                    assistantContent;
                            }

                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error('Failed to parse JSON:', jsonStr, e);
                    }
                }
            }
        }

        // Finalize the conversation
        conversationHistory[conversationHistory.length - 1].content = assistantContent;
        saveConversationHistory();
        updateStatus('');
    } catch (error) {
        console.error('Error:', error);
        updateStatus(`Error: ${error.message}`, 'error');

        // Remove typing indicator if still present
        const typingIndicator = chatMessagesDiv.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.parentElement.remove();
        }

        // Remove the empty assistant message if it exists
        if (
            conversationHistory.length > 0 &&
            conversationHistory[conversationHistory.length - 1].role === 'assistant' &&
            conversationHistory[conversationHistory.length - 1].content === ''
        ) {
            conversationHistory.pop();
        }
    } finally {
        // Re-enable input
        isLoading = false;
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadConversationHistory();
    messageInput.focus();
    
    const token = getAuthToken();
    if (token) {
        updateStatus('Ready to chat!', 'success');
        console.log('Authentication token loaded');
    } else {
        updateStatus('Ready to chat! (No token set - may require authentication)', '');
        console.info('No authentication token set. The app will work if your backend allows it.');
        console.info('To set a token, use: setAuthToken("your-token")');
    }
});

// Expose utility functions globally
window.setAuthToken = setAuthToken;
window.clearAuthToken = clearAuthToken;
window.getAuthToken = getAuthToken;
window.clearConversation = clearConversation;
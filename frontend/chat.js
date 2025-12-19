// Global state
let conversationHistory = [];
let isLoading = false;

// DOM elements
const chatMessagesDiv = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const statusDiv = document.getElementById('status');

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const MODEL_NAME = 'sciefy';
const LOCAL_API_TOKEN = null; // Set to a token string if authentication is required

/**
 * Load conversation history from localStorage
 */
function loadConversationHistory() {
    const saved = localStorage.getItem('conversationHistory');
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
 * Save conversation history to localStorage
 */
function saveConversationHistory() {
    localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
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
 * @param {string} role - 'user' or 'assistant'
 * @param {string} content - message content
 * @param {boolean} animate - whether to animate the message
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
 * @returns {HTMLElement} typing indicator element
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
 * @param {string} message - status message
 * @param {string} type - 'error', 'loading', or '' for normal
 */
function updateStatus(message, type = '') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
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
            messages: conversationHistory.slice(0, -1), // Exclude the empty assistant message we just added
            stream: true,
        };

        // Build headers
        const headers = {
            'Content-Type': 'application/json',
        };

        if (LOCAL_API_TOKEN) {
            headers['x-local-token'] = LOCAL_API_TOKEN;
        }

        // Fetch with streaming
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        // Remove typing indicator once we start receiving data
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

/**
 * Event listener for send button
 */
sendButton.addEventListener('click', sendMessage);

/**
 * Event listener for Enter key in textarea
 * Enter sends message, Shift+Enter creates new line
 */
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    loadConversationHistory();
    messageInput.focus();
    updateStatus('Ready to chat!');
});

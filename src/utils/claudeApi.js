import { getApiKey } from './apiKeyStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant having a conversation with a user.
Pay careful attention to the full conversation history provided.
Remember details the user has shared (like their name, preferences, or previous topics) and use them in your responses.
Be consistent with what you've said earlier in the conversation.`;

/**
 * Send a message to Claude AI through the proxy server
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Optional settings
 * @param {number} options.maxTokens - Maximum tokens for the response
 * @param {string} options.system - System prompt (uses default if not provided)
 * @returns {Promise<string>} The assistant's response text
 */
export async function sendMessageToClaude(messages, options = {}) {
  const { maxTokens = 2048, system = DEFAULT_SYSTEM_PROMPT } = options;
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('No API key found. Please log in again.');
  }

  try {
    const response = await fetch(`${API_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        max_tokens: maxTokens,
        system: system,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Extract text from the response
    if (data.content && data.content.length > 0) {
      return data.content[0].text;
    }

    throw new Error('Invalid response format from API');
  } catch (error) {
    console.error('Error sending message to Claude:', error);
    throw error;
  }
}


import { useState } from 'react';
import './LandingPage.css';

export default function LandingPage({ onApiKeySubmit }) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Invalid API key format. Claude API keys start with "sk-ant-"');
      return;
    }

    setIsValidating(true);

    try {
      // Validate the API key by making a simple request through the proxy
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
  
      const data = await response.json();

      if (response.ok) {
        // API key is valid, save it and proceed
        onApiKeySubmit(apiKey);
      } else if (response.status === 401) {
        setError('Invalid API key. Please check your key and try again.');
      } else {
        setError(data.error?.message || 'Failed to validate API key. Please try again.');
      }
    } catch (_err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1>LLM Graph UI</h1>
        <p className="subtitle">
          A node-based interface for conversing with Claude AI. Create conversation branches
          instead of linear chats.
        </p>

        <form onSubmit={handleSubmit} className="api-key-form">
          <div className="form-group">
            <label htmlFor="api-key">Claude API Key</label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className={error ? 'error' : ''}
              disabled={isValidating}
              autoComplete="off"
            />
            {error && <span className="error-message">{error}</span>}
          </div>

          <button type="submit" disabled={isValidating}>
            {isValidating ? 'Validating...' : 'Continue'}
          </button>

          <p className="api-key-info">
            Your API key is stored locally in your browser and sent through a local proxy server
            to Anthropic's API. Get your key from{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              console.anthropic.com
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

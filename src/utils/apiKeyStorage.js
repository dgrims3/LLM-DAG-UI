const API_KEY_STORAGE_KEY = 'claude_api_key';

export function saveApiKey(apiKey) {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    return true;
  } catch (error) {
    console.error('Failed to save API key:', error);
    return false;
  }
}

export function getApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to retrieve API key:', error);
    return null;
  }
}

export function clearApiKey() {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear API key:', error);
    return false;
  }
}

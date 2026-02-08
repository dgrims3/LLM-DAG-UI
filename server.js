import express from 'express';
import cors from 'cors';
const app = express();

// Model configuration - controlled by server
const MODEL_NAME = process.env.MODEL_NAME || 'claude-3-5-haiku-20241022';

// CORS configuration - restrict origins in production
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'anthropic-version'],
}));
app.use(express.json());

app.post('/api/messages', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    // Override model with server configuration
    const requestBody = {
      ...req.body,
      model: MODEL_NAME
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    // Don't expose internal error details to client
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});

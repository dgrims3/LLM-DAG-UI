# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project is a node based UI to talk with an LLM. It will allow the user to create conversation branches instead of the standard linear conversation.

## Development Commands

```bash
# Start development server with HMR
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Tech Stack
- **Framework**: React 19.1.1 with React DOM
- **Build Tool**: Vite 7.1.7 with @vitejs/plugin-react (uses Babel for Fast Refresh)
- **Graph Library**: @xyflow/react (v12.8.6) for node-based graph visualization
- **Backend**: Express.js proxy server for Anthropic API requests
- **Linting**: ESLint 9.36.0 with React Hooks and React Refresh plugins

### Project Structure
- `src/main.jsx` - Application entry point, renders the App component into the DOM
- `src/App.jsx` - Main application component containing ReactFlow graph implementation
- `src/components/LandingPage.jsx` - API key validation and entry screen
- `src/index.css` - Global styles
- `index.html` - HTML entry point for Vite
- `server.js` - Express proxy server for Anthropic API (runs on port 3001)

### Environment Variables

**Backend (server.js):**
- `MODEL_NAME` - Claude model to use (default: `claude-3-5-haiku-20241022`)
- `PORT` - Proxy server port (default: `3001`)

**Frontend (Vite, must be prefixed with `VITE_`):**
- `VITE_API_URL` - Backend API URL (default: `http://localhost:3001`)

Copy `.env.example` to `.env` to configure locally. In production, set these via your hosting platform's environment variable settings.

### Proxy Server Architecture
The app uses a user-provided API key model (free tool):
1. Users provide their own Anthropic API keys
2. Frontend sends requests to local Express proxy (`localhost:3001`)
3. Proxy forwards requests to Anthropic API with user's API key
4. Model selection is controlled server-side via `MODEL_NAME` environment variable

### State Management
The application uses React's built-in useState and useCallback hooks for managing graph state:
- Nodes and edges are stored in component state
- Changes to nodes/edges are handled via ReactFlow's change handlers (applyNodeChanges, applyEdgeChanges)
- Edge connections are handled via addEdge utility from @xyflow/react

### ReactFlow Integration
The App component implements a controlled ReactFlow instance:
- Nodes and edges are controlled state
- onNodesChange, onEdgesChange, and onConnect callbacks update state
- ReactFlow renders full viewport (100vw x 100vh) with fitView enabled

## ESLint Configuration

The project uses ESLint flat config format with:
- Recommended JS rules from @eslint/js
- React Hooks recommended-latest rules
- React Refresh rules for Vite
- Custom rule: unused variables are errors, except for uppercase/underscore prefixed names (varsIgnorePattern: '^[A-Z_]')
- Browser globals enabled
- ECMAScript 2020/latest with JSX support
- The `dist` directory is globally ignored

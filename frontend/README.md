# FlowIQ Frontend

React + TypeScript + Vite UI for FlowIQ.

## Prerequisites
- Node.js `18+` (or `20+`)
- Backend running locally (default: `http://localhost:8000`)

## Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Environment variables
| Key | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend base URL |

## Useful scripts
- `npm run dev` — local dev server
- `npm run build` — production build (outputs to `frontend/dist`)
- `npm run preview` — serve the production build locally
- `npm run lint` — ESLint

## Notes
- If the backend runs on a different port/host, update `VITE_API_BASE_URL` and restart `npm run dev`.

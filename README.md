# Cashflow Decision Engine MVP

A constraint-aware financial operating system that not only predicts cash flow but actively decides, simulates, and executes financial strategies under uncertainty.

## System Architecture

The project is broken into two main parts:
- **Backend**: FastAPI (Python) for deterministic financial reasoning, clustering, and data operations layer.
- **Frontend**: Vite + React (TypeScript) for the interactive User Interface.

## Getting Started

### Backend Setup
1. `cd backend`
2. `python3 -m venv .venv`
3. `source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload`

The backend will run on `http://localhost:8000`.

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

The frontend will run on `http://localhost:5173`.

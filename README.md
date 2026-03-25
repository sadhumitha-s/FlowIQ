# FlowIQ

FlowIQ is a cashflow decision engine that combines deterministic optimization with explainable AI reasoning.

## What It Does
- Tracks current cash, payables, and receivables.
- Runs tax-envelope and available-cash calculations.
- Optimizes payment allocation using PuLP (linear programming).
- Produces action directives: `Pay`, `Negotiate`, `Delay`.
- Generates mathematical justifications from solver signals (dual variables, shadow prices, reduced costs).
- Supports OCR ingestion for invoices/bills with optional Groq Vision fallback.

## Tech Stack
- Backend: FastAPI, SQLAlchemy, Alembic, Pandas, PuLP, Pydantic
- Database: SQLite (default) or PostgreSQL/Supabase via `SQLALCHEMY_DATABASE_URI`
- Frontend: React + TypeScript + Vite
- AI Services: Groq API (Vision + chat reasoning)

## Repository Layout
```text
FlowIQ/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # accounts, payables, receivables, engine, ingestion
│   │   ├── services/            # runway, reasoning_engine, ocr_ingestion, vision_invoice, clustering
│   │   ├── core/config.py
│   │   ├── models/domain.py
│   │   └── schemas/schemas.py
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
└── README.md
```

## Backend Setup
1. `cd backend`
2. `python3 -m venv .venv`
3. `source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. `cp .env.example .env`
6. Set `SQLALCHEMY_DATABASE_URI` in `.env` (or use default local SQLite)
7. `alembic upgrade head`
8. `uvicorn app.main:app --reload`

Backend base URL: `http://localhost:8000`
OpenAPI: `http://localhost:8000/api/v1/openapi.json`
Health: `GET /health`

## Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

Frontend URL: `http://localhost:5173`

## API Surface
All backend endpoints are prefixed by `/api/v1`.

- Accounts
  - `GET /accounts/`
  - `POST /accounts/`
- Payables
  - `GET /payables/`
  - `POST /payables/`
  - `DELETE /payables/{item_id}`
- Receivables
  - `GET /receivables/`
  - `POST /receivables/`
  - `DELETE /receivables/{item_id}`
- Engine
  - `GET /engine/insights`
  - `GET /engine/actions`
- Ingestion
  - `POST /ingestion/ocr` (multipart image + `default_item_type`)

## Explainable Reasoning Engine
`GET /api/v1/engine/actions` runs optimization and builds justifications from:
- Primal decisions (`pay_i` allocations)
- Cash constraint dual (`CashConstraint` shadow price)
- Per-item cap constraint duals (`Cap_{id}` shadow prices)
- Variable reduced costs (`dj`)

Then it optionally calls a Groq chat model to convert strict numeric context into plain-English mathematical explanations.

If LLM reasoning is disabled/unavailable, deterministic dual-aware fallback explanations are returned.

## Groq Configuration
Set these in `backend/.env`:

```bash
GROQ_API_KEY=your_api_key
GROQ_BASE_URL=https://api.groq.com/openai/v1

# Vision fallback (OCR)
VISION_FALLBACK_ENABLED=false
GROQ_MODEL=llama-3.2-11b-vision-preview
VISION_TIMEOUT_SECONDS=45

# Reasoning engine (actions explanations)
REASONING_LLM_ENABLED=true
GROQ_REASONING_MODEL=llama-3.1-8b-instant
REASONING_TIMEOUT_SECONDS=20
```

## OCR Ingestion Notes
- Endpoint: `POST /api/v1/ingestion/ocr`
- Accepts image uploads only.
- Uses Tesseract OCR first.
- Falls back to Groq Vision (if enabled) when OCR extraction/parsing fails.
- Vision output is schema-validated: `vendor`, `due_date`, `amount`.

## Tests
From repo root:
```bash
pytest -q backend/tests
```

# FlowIQ

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
![Status](https://img.shields.io/badge/status-MVP-blue)
![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688)
![React](https://img.shields.io/badge/frontend-React%2019-61DAFB)
![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6)
![TailwindCSS](https://img.shields.io/badge/styling-TailwindCSS%204-06B6D4)

Cashflow intelligence for founders and finance teams: optimize what to pay now, what to negotiate, and what to defer, with explainable decision math and optional LLM assist.

## Features
- Cash posture dashboard for `current_cash`, tax envelope, and runway impact.
- Deterministic optimization of payables with linear programming (`PuLP`).
- Action directives per payable: `Pay`, `Negotiate`, or `Delay`.
- Explainable reasoning based on solver internals (duals, shadow prices, reduced costs).
- Negotiation email generation for partial-payment (`Negotiate`) actions.
- OCR ingestion for invoice/bill images with optional Groq Vision fallback.
- Category clustering for unassigned payables.

## Architecture
- Backend API: FastAPI + SQLAlchemy + Alembic + Pydantic.
- Optimization/Decision Engine: PuLP + deterministic business logic.
- AI Layer: Groq-backed reasoning, negotiation copy generation, and OCR fallback.
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS 4.
- Database: Supabase PostgreSQL via `SQLALCHEMY_DATABASE_URI` (SQLite still supported for local fallback).

## Project Structure
```text
FlowIQ/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── api.py
│   │   │   └── routes/
│   │   │       ├── accounts.py
│   │   │       ├── payables.py
│   │   │       ├── receivables.py
│   │   │       ├── engine.py
│   │   │       └── ingestion.py
│   │   ├── core/config.py
│   │   ├── db/session.py
│   │   ├── models/domain.py
│   │   ├── schemas/schemas.py
│   │   └── services/
│   │       ├── runway.py
│   │       ├── tax_engine.py
│   │       ├── reasoning_engine.py
│   │       ├── negotiation_engine.py
│   │       ├── ocr_ingestion.py
│   │       ├── vision_invoice.py
│   │       └── clustering.py
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/api.ts
│   ├── package.json
│   └── vite.config.ts
├── PRD-CashflowDecisionEngine-MVP.md
├── README.md
└── LICENSE
```

## Quick Start
### 1) Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set your Supabase Postgres URI
# SQLALCHEMY_DATABASE_URI=postgresql+psycopg2://USER:PASSWORD@HOST:5432/postgres
alembic upgrade head
uvicorn app.main:app --reload
```

Backend endpoints:
- Base URL: `http://localhost:8000`
- OpenAPI schema: `http://localhost:8000/api/v1/openapi.json`
- Health check: `GET /health`

### 2) Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend URL: `http://localhost:5173`

## Environment Variables (`backend/.env`)
| Key | Required | Default | Purpose |
|---|---|---|---|
| `SQLALCHEMY_DATABASE_URI` | Yes (for Supabase) | `sqlite:///./cashflow.db` | DB connection string (use your Supabase Postgres URI) |
| `VISION_FALLBACK_ENABLED` | No | `false` | Enable Groq Vision fallback when OCR fails |
| `VISION_TIMEOUT_SECONDS` | No | `45` | Vision request timeout |
| `GROQ_API_KEY` | If AI enabled | _empty_ | Groq API credential |
| `GROQ_BASE_URL` | No | `https://api.groq.com/openai/v1` | Groq-compatible base URL |
| `GROQ_MODEL` | No | `llama-3.2-11b-vision-preview` | Vision fallback model |
| `REASONING_LLM_ENABLED` | No | `true` | Enable LLM explanation generation |
| `GROQ_REASONING_MODEL` | No | `llama-3.1-8b-instant` | Reasoning model |
| `REASONING_TIMEOUT_SECONDS` | No | `20` | Reasoning timeout |
| `NEGOTIATION_LLM_ENABLED` | No | `true` | Enable negotiation email generation |
| `GROQ_NEGOTIATION_MODEL` | No | `llama-3.1-8b-instant` | Negotiation model |
| `NEGOTIATION_TIMEOUT_SECONDS` | No | `20` | Negotiation timeout |

## API Summary
All API endpoints are prefixed by `/api/v1`.

| Domain | Method | Path | Description |
|---|---|---|---|
| Accounts | `GET` | `/accounts/` | List account balances |
| Accounts | `POST` | `/accounts/` | Create/update account balance |
| Payables | `GET` | `/payables/` | List payables |
| Payables | `POST` | `/payables/` | Create payable |
| Payables | `DELETE` | `/payables/{item_id}` | Delete payable |
| Receivables | `GET` | `/receivables/` | List receivables |
| Receivables | `POST` | `/receivables/` | Create receivable |
| Receivables | `DELETE` | `/receivables/{item_id}` | Delete receivable |
| Engine | `GET` | `/engine/insights` | Dashboard metrics |
| Engine | `GET` | `/engine/actions` | Optimized action plan |
| Engine | `POST` | `/engine/actions/{item_id}/negotiation-email` | Generate negotiation draft (only for `Negotiate`) |
| Ingestion | `POST` | `/ingestion/ocr` | OCR ingest image file into financial items |

## Explainability Model
For each actionable payable, FlowIQ can produce a deterministic rationale derived from solver artifacts:
- primal decisions (`pay_i`),
- cash constraint duals/shadow prices,
- cap-constraint duals (`Cap_{id}`),
- reduced costs (`dj`).

If enabled, an LLM rewrites this numeric context into concise natural language while preserving the math. If unavailable, deterministic fallback explanations are returned.

## Testing
From repository root:
```bash
pytest -q backend/tests
```

## Development Notes
- CORS is currently open (`allow_origins=["*"]`) for local MVP velocity.
- Tables are auto-created at startup (`Base.metadata.create_all`) and migrations are also available via Alembic.
- OCR endpoint accepts only image MIME types.

## License
This project is licensed under the Apache License 2.0. See [LICENSE](./LICENSE).

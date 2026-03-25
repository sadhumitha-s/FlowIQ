# Cashflow Decision Engine MVP

A constraint-aware financial operating system that not only predicts cash flow but actively decides, simulates, and executes financial strategies under uncertainty.

## System Architecture

The project is broken into two main parts:
- **Backend (Operations Research & AI Pipeline)**: Built on FastAPI (Python). It utilizes **Pandas** for high-speed time-series transformations and the **PuLP** constraint optimization engine (Mixed-Integer Linear Programming) to deterministically route payments. Data is persisted to an external **PostgreSQL (Supabase)** database via SQLAlchemy and Alembic.
- **Frontend (Interactive Canvas)**: Vite + React (TypeScript) for the interactive User Interface and scenario stress-testing.

## Getting Started

### Backend Setup
1. `cd backend`
2. `python3 -m venv .venv`
3. `source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. Configure your environment:
   ```bash
   cp .env.example .env
   ```
   *Open `.env` and map your Supabase PostgreSQL URI to `SQLALCHEMY_DATABASE_URI`.*
6. Run the database structure migrations:
   ```bash
   alembic upgrade head
   ```
7. Start the financial simulation engine:
   ```bash
   uvicorn app.main:app --reload
   ```

The backend API and Swagger Docs will run on `http://localhost:8000`.

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

The frontend will start instantly on `http://localhost:5173`.

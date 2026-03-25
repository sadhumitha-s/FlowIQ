# Cashflow Decision Engine MVP

A constraint-aware financial operating system that not only predicts cash flow but actively decides, simulates, and executes financial strategies under uncertainty.

## System Architecture

The project is broken into two main parts:
- **Backend (Operations Research & AI Pipeline)**: Built on FastAPI (Python). It utilizes **Pandas** for high-speed time-series transformations and the **PuLP** constraint optimization engine (Mixed-Integer Linear Programming) to deterministically route payments. Data is persisted to an external **PostgreSQL (Supabase)** database via SQLAlchemy and Alembic.
- **Frontend (Interactive Canvas)**: Vite + React (TypeScript) for the interactive User Interface and scenario stress-testing.

## Project Structure

```
FlowIQ/
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example
│   ├── alembic.ini
│   ├── cashflow.db
│   ├── requirements.txt
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 0edec47a55b2_initial_schema.py
│   ├── app/
│   │   ├── api/
│   │   │   └── api.py
│   │   ├── core/config.py
│   │   ├── db/session.py
│   │   ├── models/domain.py
│   │   ├── schemas/schemas.py
│   │   ├── services/
│   │   │   ├── clustering.py
│   │   │   ├── runway.py
│   │   │   └── tax_engine.py
│   │   └── main.py
│   └── tests/
│       └── test_services.py
├── docs
├── frontend/
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── eslint.config.js
│   ├── dist/
│   │   └── assets/
│   │       ├── index-Belenkwd.css
│   │       └── index-CJtDb8Td.js
│   ├── public/
│   └── src/
│       ├── App.css
│       ├── App.tsx
│       ├── index.css
│       ├── main.tsx
│       ├── assets/
│       │   ├── hero.png
│       │   ├── react.svg
│       │   └── vite.svg
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   └── Ingestion.tsx
│       └── services/
│           └── api.ts
```

## Getting Started

### Backend Setup
1. `cd backend`
2. `python3 -m venv .venv`
3. `source .venv/bin/activate`
4. `pip install -r requirements.txt`
   - OCR ingestion also requires the system binary `tesseract` to be installed and available on PATH.
   - Optional Vision fallback uses Groq-hosted Llama 3.2 Vision.
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

### OCR Ingestion Endpoint
- `POST /api/v1/ingestion/ocr`
- Form fields:
  - `file`: image file (`image/*`)
  - `default_item_type`: `payable` or `receivable`
- Behavior:
  - Runs Tesseract OCR on uploaded financial documents.
  - Extracts line-items (name, amount, due date, type), structures them with a pandas normalization step, and inserts them into `financial_items`.
  - When OCR fails to read or parse complex invoices, optional Vision fallback routes the image to Groq-hosted Llama 3.2 Vision and validates strict JSON schema fields: `vendor`, `due_date`, `amount`.

### Vision Fallback Configuration
Set these in `backend/.env` to enable intelligent document processing:

```bash
VISION_FALLBACK_ENABLED=true
GROQ_API_KEY=your_api_key
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.2-11b-vision-preview
```

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`

The frontend will start instantly on `http://localhost:5173`.

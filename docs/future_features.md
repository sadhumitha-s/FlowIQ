# Future Features (Post-MVP)

The following features have been explicitly scoped out of the initial MVP to ensure we can deliver a stable, modular foundation first. They should be added iteratively once the core constraint engine is conceptually stable.

## 1. Advanced Constraint Optimization Engine (Operations Research)
- **What:** Replacing simpler heuristic rankings with MILP (Mixed-Integer Linear Programming) via `PuLP` or `SciPy`.
- **Why Deferred:** Requires strict schema validations and more complex solver setups. The MVP uses programmatic logic rule-trees to map out constraints accurately first.

## 2. Subscription Audit & Creep Detector
- **What:** Identifies underused SaaS subscriptions via CSV upload.
- **Why Deferred:** Peripheral to the primary "cash crunch survival" algorithm which calculates runway and obligations.

## 3. Intelligent Document Processing (Vision AI)
- **What:** Llama 3.2 Vision via Ollama to parse complex unstructured PDFs (Messy invoices).
- **Why Deferred:** MVP relies on structured manual forms or deterministic Regex extraction to ensure zero-cost setup without requiring heavy local resources right away. 

## 4. NLP Copilot Interface
- **What:** AI agent that translates user instructions like "What if I delay AWS?" into underlying API functional calls.
- **Why Deferred:** Exposing a copilot safely requires the deterministic endpoints (the target of the LLM function calls) to be 100% bug-free to avoid hallucination. Building the secure endpoints comes first.

## 5. Predictive Cashflow Forecasting (ML)
- **What:** Prophet or ARIMA time-series models for identifying "ghost" expenses and forecasting seasonal dips.
- **Why Deferred:** The primary issue isn't predicting unknown variables, it is conflict resolution of known existing variables (this cash, these bills right now).

import pandas as pd
import pulp
from typing import Any, List, Tuple, Dict, Optional
from datetime import date
from app.models.domain import FinancialItem, ItemType, CategoryType
from app.schemas.schemas import ActionDirective, CashRunwayPoint
from app.services.reasoning_engine import generate_llm_rationales


def _penalty_rate_value(item: FinancialItem) -> float:
    return float(item.penalty_rate or 0.0)

def calculate_runway(available_cash: float, payables: List[FinancialItem], receivables: List[FinancialItem]) -> Tuple[int, List[str]]:
    """
    Simulates the runway using pandas DataFrames for time-series calculation.
    """
    today = date.today()
    
    # Create DataFrames
    p_data = [{"date": p.due_date, "amount": -p.amount, "name": p.name} for p in payables]
    r_data = [{"date": r.due_date, "amount": r.amount, "name": r.name} for r in receivables]
    
    all_data = p_data + r_data
    
    if not all_data:
        return 999, []
        
    df = pd.DataFrame(all_data)
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df = df.sort_values(by="date")
    
    # Calculate cumulative cash
    df["cumulative_cash"] = available_cash + df["amount"].cumsum()
    
    days_to_zero = 999
    failure_modes = []
    
    # Identify failures
    df_negative = df[df["cumulative_cash"] < 0]
    if not df_negative.empty:
        first_failure = df_negative.iloc[0]
        days_diff = (first_failure["date"] - today).days
        days_to_zero = max(0, days_diff)
        
        for _, row in df_negative.iterrows():
            shortfall = abs(row["cumulative_cash"])
            failure_modes.append(f"Shortfall of ${shortfall:,.2f} expected on {row['date']} due to {row['name']}.")
            
    return days_to_zero, failure_modes


def project_survival_curve(
    available_cash: float,
    payables: List[FinancialItem],
    receivables: List[FinancialItem],
    payment_plan: Optional[Dict[int, float]] = None,
) -> Tuple[int, List[str], List[CashRunwayPoint]]:
    """
    Projects cumulative cash by due-date events.
    Optional payment_plan allows non-persistent stress simulations that reuse optimized pay-now allocations.
    """
    today = date.today()
    events: List[Dict[str, Any]] = []

    for p in payables:
        planned_payment = p.amount
        if payment_plan is not None:
            planned_payment = max(0.0, float(payment_plan.get(p.id, 0.0)))
        if planned_payment <= 0:
            continue
        events.append(
            {
                "date": p.due_date,
                "amount": -planned_payment,
                "name": p.name,
            }
        )

    for r in receivables:
        if r.amount <= 0:
            continue
        events.append(
            {
                "date": r.due_date,
                "amount": r.amount,
                "name": r.name,
            }
        )

    if not events:
        return (
            999,
            [],
            [
                CashRunwayPoint(
                    date=today,
                    day_offset=0,
                    cumulative_cash=round(float(available_cash), 2),
                    survives=available_cash >= 0,
                )
            ],
        )

    df = pd.DataFrame(events)
    df["date"] = pd.to_datetime(df["date"]).dt.date
    df = df.sort_values(by="date")
    daily = df.groupby("date", as_index=False)["amount"].sum().sort_values(by="date")

    points: List[CashRunwayPoint] = [
        CashRunwayPoint(
            date=today,
            day_offset=0,
            cumulative_cash=round(float(available_cash), 2),
            survives=available_cash >= 0,
        )
    ]

    cumulative_cash = float(available_cash)
    for _, row in daily.iterrows():
        event_date = row["date"]
        cumulative_cash += float(row["amount"])
        day_offset = max(0, (event_date - today).days)
        points.append(
            CashRunwayPoint(
                date=event_date,
                day_offset=day_offset,
                cumulative_cash=round(cumulative_cash, 2),
                survives=cumulative_cash >= 0,
            )
        )

    days_to_zero = 999
    failure_modes: List[str] = []

    for point in points[1:]:
        if point.cumulative_cash < 0:
            if days_to_zero == 999:
                days_to_zero = point.day_offset
            failure_modes.append(
                f"Shortfall of ${abs(point.cumulative_cash):,.2f} expected on {point.date}."
            )

    return days_to_zero, failure_modes, points


def get_category_weight(category: CategoryType) -> float:
    # Resolve Enum to string safely
    cat_str = category.value if hasattr(category, "value") else str(category)
    if cat_str == "fixed": return 1000.0
    if cat_str == "strategic": return 50.0
    return 10.0

def get_risk_weight(risk: str) -> float:
    risk_lower = risk.lower() if risk else "low"
    if risk_lower == "high": return 100.0
    if risk_lower == "medium": return 50.0
    return 10.0


def _delay_cost_per_dollar(item: FinancialItem, today: date) -> float:
    return (
        (_penalty_rate_value(item) * 500)
        + get_category_weight(item.category)
        + get_risk_weight(item.relationship_risk)
        + (max(0, 30 - (item.due_date - today).days) * 2)
    )


def _extract_constraint_shadow_prices(prob: pulp.LpProblem) -> Dict[str, float]:
    shadow_prices: Dict[str, float] = {}
    for name, constraint in prob.constraints.items():
        dual = getattr(constraint, "pi", None)
        if dual is None:
            continue
        shadow_prices[name] = round(float(dual), 6)
    return shadow_prices


def _fallback_justification(
    action: str,
    paid_amount: float,
    total_amount: float,
    coeff: float,
    cash_shadow_price: float,
    reduced_cost: float,
) -> str:
    unpaid_amount = max(0.0, round(total_amount - paid_amount, 2))
    if action == "Pay":
        return (
            f"Paid in full (${paid_amount:,.2f}) because the delay-cost coefficient ({coeff:.2f} per $1 unpaid) "
            f"exceeded the cash shadow price ({cash_shadow_price:.2f}), so withholding this payment would raise the objective more than reallocating cash."
        )
    if action == "Negotiate":
        return (
            f"Partially funded at ${paid_amount:,.2f} with ${unpaid_amount:,.2f} deferred. "
            f"The optimizer balanced this item's delay-cost coefficient ({coeff:.2f}) against the binding cash shadow price ({cash_shadow_price:.2f}), "
            f"producing a marginal reduced-cost signal of {reduced_cost:.4f} near the allocation boundary."
        )
    return (
        f"Deferred because paying from zero would consume constrained cash priced at {cash_shadow_price:.2f} per $1, "
        f"while this item's reduced-cost signal ({reduced_cost:.4f}) indicates lower marginal objective benefit than funded alternatives."
    )


def generate_action_directives(available_cash: float, payables: List[FinancialItem]) -> List[ActionDirective]:
    """
    Replaces rule-based heuristics with deterministic MILP via PuLP.
    Objective: Minimize the penalty cost of delayed payments.
    """
    if not payables:
        return []
        
    # Define the problem: Minimize total delay cost
    prob = pulp.LpProblem("CashflowOptimization", pulp.LpMinimize)
    
    # Variables: y_i is the amount we DECIDE to pay for item i
    payment_vars = {}
    delay_cost_coeffs: Dict[int, float] = {}
    cap_constraints: Dict[int, str] = {}
    
    # Cost modeling factors
    today = date.today()
    
    for p in payables:
        # Total cost of delaying $1 for this payable
        delay_cost_coeffs[p.id] = _delay_cost_per_dollar(p, today=today)

        # Variable: amount paid towards this payable
        payment_vars[p.id] = pulp.LpVariable(f"pay_{p.id}", lowBound=0, cat='Continuous')

        # Explicit upper-bound constraints let us read shadow prices for each payable cap
        constraint_name = f"Cap_{p.id}"
        prob += payment_vars[p.id] <= p.amount, constraint_name
        cap_constraints[p.id] = constraint_name
        
    # Objective function: Minimize sum of (Amount - Paid) * DelayCostPerDollar
    prob += pulp.lpSum([
        (p.amount - payment_vars[p.id]) * delay_cost_coeffs[p.id] for p in payables
    ]), "TotalDelayCost"
    
    # Constraint 1: Total cash outgoing cannot exceed available cash
    prob += pulp.lpSum([payment_vars[p.id] for p in payables]) <= available_cash, "CashConstraint"
    
    # Solve the MILP
    prob.solve(pulp.PULP_CBC_CMD(msg=False))
    
    shadow_prices = _extract_constraint_shadow_prices(prob)
    cash_shadow_price = shadow_prices.get("CashConstraint", 0.0)

    reasoning_context: Dict[str, Any] = {
        "problem": "CashflowOptimization",
        "objective": "Minimize sum((amount_i - pay_i) * delay_cost_i)",
        "available_cash": round(float(available_cash), 2),
        "cash_constraint_shadow_price": cash_shadow_price,
        "constraint_shadow_prices": shadow_prices,
        "items": [],
    }

    # Extract results and generate directives
    directives = []
    
    for p in payables:
        paid_amount = pulp.value(payment_vars[p.id]) or 0.0
        
        # Handle precision floating point issues
        paid_amount = round(paid_amount, 2)
        target_amount = round(p.amount, 2)
        
        cat_str = p.category.value if hasattr(p.category, "value") else str(p.category)
        coeff = delay_cost_coeffs[p.id]
        reduced_cost = round(float(getattr(payment_vars[p.id], "dj", 0.0) or 0.0), 6)
        cap_shadow_price = shadow_prices.get(cap_constraints[p.id], 0.0)
        
        if paid_amount >= target_amount - 0.01:
            action = "Pay"
        elif paid_amount > 0.01:
            action = "Negotiate"
        else:
            action = "Delay"

        justification = _fallback_justification(
            action=action,
            paid_amount=paid_amount,
            total_amount=target_amount,
            coeff=coeff,
            cash_shadow_price=cash_shadow_price,
            reduced_cost=reduced_cost,
        )

        reasoning_context["items"].append(
            {
                "item_id": p.id,
                "name": p.name,
                "category": cat_str,
                "relationship_risk": p.relationship_risk,
                "amount": target_amount,
                "amount_paid": paid_amount,
                "amount_unpaid": round(target_amount - paid_amount, 2),
                "action": action,
                "delay_cost_per_dollar": round(coeff, 4),
                "reduced_cost": reduced_cost,
                "cap_constraint_shadow_price": cap_shadow_price,
            }
        )

        directives.append(ActionDirective(
            item_id=p.id,
            name=p.name,
            action=action,
            amount_to_pay=paid_amount,
            justification=justification
        ))
        
    # Sort action directives: Pay -> Negotiate -> Delay
    sort_order = {"Pay": 1, "Negotiate": 2, "Delay": 3}
    directives.sort(key=lambda x: (sort_order.get(x.action, 4), -x.amount_to_pay))

    llm_rationales = generate_llm_rationales(
        context=reasoning_context,
        expected_item_ids={p.id for p in payables},
    )
    if llm_rationales:
        for directive in directives:
            llm_text = llm_rationales.get(directive.item_id)
            if llm_text:
                directive.justification = llm_text
    
    return directives

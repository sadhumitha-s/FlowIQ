import pandas as pd
import pulp
from typing import List, Tuple, Dict
from datetime import date
from app.models.domain import FinancialItem, ItemType, CategoryType
from app.schemas.schemas import ActionDirective


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
    
    # Cost modeling factors
    today = date.today()
    
    for p in payables:
        cat_weight = get_category_weight(p.category)
        risk_weight = get_risk_weight(p.relationship_risk)
        urgency_weight = max(0, 30 - (p.due_date - today).days) * 2  # Closer due dates hurt more to delay
        
        # Total cost of delaying $1 for this payable
        delay_cost_per_dollar = (_penalty_rate_value(p) * 500) + cat_weight + risk_weight + urgency_weight
        
        # Variable: amount paid towards this payable
        payment_vars[p.id] = pulp.LpVariable(f"pay_{p.id}", lowBound=0, upBound=p.amount, cat='Continuous')
        
    # Objective function: Minimize sum of (Amount - Paid) * DelayCostPerDollar
    prob += pulp.lpSum([
        (p.amount - payment_vars[p.id]) * (
            (_penalty_rate_value(p) * 500) +
            get_category_weight(p.category) +
            get_risk_weight(p.relationship_risk) +
            max(0, 30 - (p.due_date - today).days) * 2
        ) for p in payables
    ]), "TotalDelayCost"
    
    # Constraint 1: Total cash outgoing cannot exceed available cash
    prob += pulp.lpSum([payment_vars[p.id] for p in payables]) <= available_cash, "CashConstraint"
    
    # Solve the MILP
    prob.solve(pulp.PULP_CBC_CMD(msg=False))
    
    # Extract results and generate directives
    directives = []
    
    for p in payables:
        paid_amount = pulp.value(payment_vars[p.id]) or 0.0
        
        # Handle precision floating point issues
        paid_amount = round(paid_amount, 2)
        target_amount = round(p.amount, 2)
        
        cat_str = p.category.value if hasattr(p.category, "value") else str(p.category)
        
        if paid_amount >= target_amount - 0.01:
            action = "Pay"
            justification = f"[MILP Optimized] Fully funded. High priority constraint satisfied (Category: {cat_str}, Risk: {p.relationship_risk})."
        elif paid_amount > 0.01:
            action = "Negotiate"
            justification = f"[MILP Optimized] Partial allocation constraint. Mathematical optimization allocated ${paid_amount:,.2f} to minimize overall relationship/penalty degradation."
        else:
            action = "Delay"
            justification = f"[MILP Optimized] Delayed. Model calculated that routing cash here breached the objective function's optimal penalty threshold."
            
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
    
    return directives

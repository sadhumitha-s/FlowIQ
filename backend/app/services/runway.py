from typing import List, Tuple
from app.models.domain import FinancialItem, ItemType, CategoryType
from app.schemas.schemas import ActionDirective
from datetime import date

def calculate_runway(available_cash: float, payables: List[FinancialItem], receivables: List[FinancialItem]) -> Tuple[int, List[str]]:
    """
    Basic daily simulation to find when cash drops below zero (days to zero).
    Also records failure modes.
    """
    today = date.today()
    current_cash = available_cash
    
    # Sort chronological
    timeline_items = sorted(payables + receivables, key=lambda x: x.due_date)
    
    days_to_zero = 999 
    failure_modes = []
    
    for item in timeline_items:
        if item.item_type == ItemType.receivable:
            current_cash += item.amount
        else: # payable
            current_cash -= item.amount
            if current_cash < 0:
                shortfall = abs(current_cash)
                days_diff = (item.due_date - today).days
                if days_to_zero == 999: # Record first breach
                    days_to_zero = days_diff if days_diff >= 0 else 0
                
                failure_modes.append(f"Shortfall of ${shortfall:,.2f} expected on {item.due_date} due to {item.name}.")
                # For MVP, we continue simulation to find all breaches
    
    # If no items, runway is indefinitely long (999)
    return days_to_zero, failure_modes


def generate_action_directives(available_cash: float, payables: List[FinancialItem]) -> List[ActionDirective]:
    """
    Trade-Off engine deterministically evaluating what to pay vs delay based on constraint risk score.
    """
    directives = []
    current_cash = available_cash
    
    # Score payables: higher score means rank it higher for payment
    # Rule: Fixed & high relationship risk = prioritize. Low penalty = delayable.
    scored_payables = []
    for p in payables:
        score = 0
        if p.category == CategoryType.fixed:
            score += 50
        elif p.category == CategoryType.strategic:
            score += 10
            
        if p.relationship_risk == "high":
            score += 30
        elif p.relationship_risk == "medium":
            score += 10
            
        score += p.penalty_rate * 100 # high penalty = high score
        
        # Closer due dates score higher
        days_until_due = (p.due_date - date.today()).days
        if days_until_due <= 7:
            score += 20
            
        scored_payables.append((score, p))
        
    # Sort by score descending
    scored_payables.sort(key=lambda x: x[0], reverse=True)
    
    for score, p in scored_payables:
        # Resolve category value safely to string
        cat_str = p.category.value if hasattr(p.category, 'value') else str(p.category)
        
        if current_cash >= p.amount:
            # We can pay it
            current_cash -= p.amount
            directives.append(ActionDirective(
                item_id=p.id,
                name=p.name,
                action="Pay",
                amount_to_pay=p.amount,
                justification=f"Sufficient cash available. Priority score: {score:.1f}. Category: {cat_str}."
            ))
        elif current_cash > 0:
            # Partial payment / Negotiate
            amount_to_pay = current_cash
            current_cash = 0
            directives.append(ActionDirective(
                item_id=p.id,
                name=p.name,
                action="Negotiate",
                amount_to_pay=amount_to_pay,
                justification=f"Insufficient cash for full payment. Relationship risk is {p.relationship_risk}. Suggesting a partial payment of ${amount_to_pay:,.2f}."
            ))
        else:
            # Delay
            directives.append(ActionDirective(
                item_id=p.id,
                name=p.name,
                action="Delay",
                amount_to_pay=0.0,
                justification=f"No cash available to cover this. Incurring {p.penalty_rate*100}% penalty if applicable. Lowest priority score in queue."
            ))
            
    return directives

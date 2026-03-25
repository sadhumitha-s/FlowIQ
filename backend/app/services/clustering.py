from app.models.domain import FinancialItem, CategoryType

def cluster_obligation(item: FinancialItem) -> CategoryType:
    """
    Basic deterministic rules engine for clustering obligations.
    """
    name_lower = item.name.lower()
    
    # Heuristics based on name for MVP
    fixed_keywords = ["rent", "lease", "loan", "salary", "payroll", "insurance"]
    strategic_keywords = ["marketing", "ads", "r&d", "consulting"]
    
    if any(k in name_lower for k in fixed_keywords):
        return CategoryType.fixed
    elif any(k in name_lower for k in strategic_keywords):
        return CategoryType.strategic
    else:
        return CategoryType.flexible

def cluster_all(items: list[FinancialItem]) -> list[FinancialItem]:
    for item in items:
        if item.category == CategoryType.unassigned or item.category is None:
            item.category = cluster_obligation(item)
    return items

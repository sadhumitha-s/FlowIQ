def calculate_tax_envelope(incoming_revenue: float, tax_rate: float = 0.25) -> float:
    """
    Given a sum of incoming revenue (e.g., from receivables or just historical data),
    calculate the virtual tax envelope to ring-fence.
    """
    return incoming_revenue * tax_rate

def get_available_cash(current_balance: float, tax_envelope: float) -> float:
    """
    Operational cash = total cash - what is rigidly saved for taxes.
    """
    return max(0.0, current_balance - tax_envelope)

import pandas as pd
import io
from typing import List, Dict, Any
from datetime import date
from sqlalchemy.orm import Session
from app.models.domain import Subscription
from app.schemas.schemas import SubscriptionAuditResult, SubscriptionResponse

SAAS_ALTERNATIVES = {
    "slack": {"category": "Communication", "alternative": "Mattermost / Element"},
    "notion": {"category": "Productivity", "alternative": "Obsidian / AppFlowy"},
    "zoom": {"category": "Video", "alternative": "Jitsi Meet"},
    "airtable": {"category": "Database", "alternative": "NocoDB / Baserow"},
    "aws": {"category": "Infrastructure", "alternative": "LocalStack (Dev) / Supabase Self-host"},
    "github": {"category": "DevOps", "alternative": "Gitea / GitLab CE"},
    "hubspot": {"category": "CRM", "alternative": "ERPNext / Twenty"},
    "intercom": {"category": "Support", "alternative": "Chatwoot"},
}

class SubscriptionAuditService:
    def __init__(self, db: Session):
        self.db = db

    def audit_csv(self, csv_content: bytes) -> SubscriptionAuditResult:
        # Load CSV
        df = pd.read_csv(io.BytesIO(csv_content))
        
        # Normalize columns (simple heuristic: Date, Description, Amount)
        # We look for "Description" or "Narrative" and "Amount"
        desc_col = next((c for c in df.columns if "description" in c.lower() or "narrative" in c.lower()), None)
        amt_col = next((c for c in df.columns if "amount" in c.lower() or "value" in c.lower()), None)
        
        if not desc_col or not amt_col:
            raise ValueError("CSV must contain Description and Amount columns")

        # Basic cleanup
        df[amt_col] = pd.to_numeric(df[amt_col], errors='coerce').fillna(0)
        df[desc_col] = df[desc_col].astype(str).str.lower()

        # Identify recurring subscriptions
        # Heuristic: Same description appearing at least 2 times with similar amounts
        # For MVP, we'll also just check against our known SaaS list
        detected = []
        
        # Group by description to find recurring counts
        recurring = df.groupby(desc_col).size().reset_index(name='counts')
        recurring = recurring[recurring['counts'] > 1]
        
        for name in SAAS_ALTERNATIVES.keys():
            # Check if any row description contains the SaaS name
            matches = df[df[desc_col].str.contains(name, na=False)]
            if not matches.empty:
                avg_cost = abs(matches[amt_col].mean())
                alt_info = SAAS_ALTERNATIVES[name]
                
                # Check if already in DB to avoid duplicates if needed, but for audit we return current findings
                # and then persist.
                
                sub_data = {
                    "name": name.capitalize(),
                    "monthly_cost": round(avg_cost, 2),
                    "is_active": 1,
                    "category": alt_info["category"],
                    "alternative_suggestion": alt_info["alternative"]
                }
                
                # Persist to DB
                db_sub = Subscription(**sub_data)
                self.db.add(db_sub)
                detected.append(db_sub)

        self.db.commit()
        
        # Convert to schemas
        response_subs = [SubscriptionResponse.model_validate(s) for s in detected]
        total_monthly = sum(s.monthly_cost for s in response_subs)
        
        return SubscriptionAuditResult(
            detected_subscriptions=response_subs,
            total_monthly_bleed=total_monthly,
            annual_bleed=total_monthly * 12
        )

    def get_all_active(self) -> List[SubscriptionResponse]:
        subs = self.db.query(Subscription).filter(Subscription.is_active == 1).all()
        return [SubscriptionResponse.model_validate(s) for s in subs]

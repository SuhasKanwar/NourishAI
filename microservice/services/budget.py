from __future__ import annotations

import json
from typing import Any

from database import BudgetRecord, OrderRecord, SessionLocal


class BudgetService:
    def get_or_create(self, user_id: str) -> BudgetRecord:
        with SessionLocal() as session:
            record = session.get(BudgetRecord, user_id)
            if not record:
                record = BudgetRecord(user_id=user_id, monthly_limit=12000, spent=0)
                session.add(record)
                session.commit()
                session.refresh(record)
            session.expunge(record)
            return record

    def summary(self, user_id: str) -> dict[str, Any]:
        record = self.get_or_create(user_id)
        remaining = max(record.monthly_limit - record.spent, 0)
        return {
            "monthly_limit": record.monthly_limit,
            "total_spent": record.spent,
            "remaining": remaining,
            "usage_percent": round((record.spent / record.monthly_limit) * 100, 2)
            if record.monthly_limit
            else 0,
        }

    def set_monthly_limit(self, user_id: str, amount: int) -> dict[str, Any]:
        with SessionLocal() as session:
            record = session.get(BudgetRecord, user_id) or BudgetRecord(user_id=user_id)
            record.monthly_limit = max(amount, 0)
            session.add(record)
            session.commit()
        return self.summary(user_id)

    def record_action(self, user_id: str, action_type: str, payload: dict[str, Any], amount: int = 0) -> None:
        with SessionLocal() as session:
            budget = session.get(BudgetRecord, user_id) or BudgetRecord(user_id=user_id)
            budget.spent += max(amount, 0)
            session.add(budget)
            session.add(
                OrderRecord(
                    user_id=user_id,
                    action_type=action_type,
                    payload=json.dumps(payload),
                    status="completed",
                )
            )
            session.commit()

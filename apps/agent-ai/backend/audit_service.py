from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from models import QualityAuditLog, User

# NOTE: Audit entries are written only to the new `quality_audit_logs` table.
# Existing source tables are never changed by this service.


def actor_id(actor: User | str | None) -> str | None:
    if actor is None:
        return None
    if isinstance(actor, str):
        return actor
    return str(actor.id)


def log_audit(
    db: Session,
    actor: User | str | None,
    action: str,
    target_table: str | None = None,
    target_id: str | None = None,
    before_data: dict[str, Any] | None = None,
    after_data: dict[str, Any] | None = None,
    request: Request | None = None,
    commit: bool = True,
) -> QualityAuditLog:
    entry = QualityAuditLog(
        actor=actor_id(actor),
        action=action,
        target_table=target_table,
        target_id=target_id,
        before_data=before_data,
        after_data=after_data,
        ip_address=request.client.host if request and request.client else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(entry)
    if commit:
        db.commit()
    else:
        db.flush()
    return entry

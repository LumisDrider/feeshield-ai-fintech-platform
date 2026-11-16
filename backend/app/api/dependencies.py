from __future__ import annotations
from fastapi import Depends, Request
from ..database.connection import get_db
from ..utils.validation import workspace_id


def current_workspace(request: Request, connection=Depends(get_db)):
    identity = workspace_id(getattr(request.state, "workspace_id", ""))
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE id = %s", (identity,))
        user = cursor.fetchone()
        if user is None:
            cursor.execute("INSERT INTO users (id, email) VALUES (%s, %s) ON CONFLICT (id) DO NOTHING RETURNING *", (identity, f"private-{identity[:8]}@workspace.local"))
            user = cursor.fetchone()
        if user is None:
            cursor.execute("SELECT * FROM users WHERE id = %s", (identity,))
            user = cursor.fetchone()
    return {"identity": identity, "user": user, "connection": connection}

from datetime import datetime, timezone
from uuid import uuid4
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.api.dependencies import current_workspace


class Cursor:
    def __init__(self, connection): self.connection = connection
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def execute(self, query, params=None): self.connection.last_query = query; return self
    def fetchone(self): return self.connection.row
    def fetchall(self): return []


class FakeConnection:
    def __init__(self, row=None): self.row = row
    def cursor(self): return Cursor(self)


def override(row=None):
    identity = str(uuid4())
    return lambda: {"identity": identity, "user": {"store_evidence": True}, "connection": FakeConnection(row)}


def test_api_rejects_comparing_same_contract():
    app.dependency_overrides[current_workspace] = override()
    client = TestClient(app); identity = str(uuid4())
    response = client.post("/api/comparisons", json={"analysis_a_id": identity, "analysis_b_id": identity})
    assert response.status_code == 400
    app.dependency_overrides.clear()


def test_user_document_access_restriction_returns_404():
    app.dependency_overrides[current_workspace] = override(row=None)
    client = TestClient(app)
    response = client.get(f"/api/documents/{uuid4()}")
    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_api_invalid_upload_has_meaningful_error():
    app.dependency_overrides[current_workspace] = override()
    client = TestClient(app)
    response = client.post("/api/documents/upload", files={"file": ("unsafe.exe", b"MZ executable", "application/octet-stream")})
    assert response.status_code == 422
    assert "Only PDF and TXT" in response.json()["detail"]
    app.dependency_overrides.clear()

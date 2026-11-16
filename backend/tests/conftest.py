from __future__ import annotations

import os
from pathlib import Path

import psycopg
import pytest
from dotenv import dotenv_values
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
ENV = dotenv_values(ROOT / ".env")

if not ENV.get("DATABASE_URL"):
    raise RuntimeError("Falta DATABASE_URL en .env")

# Tests run on the host against the local PostGIS container.
db_url = ENV["DATABASE_URL"].replace("@db:", "@localhost:")
db_url = db_url.rsplit("/", 1)[0] + "/automatic_test"
os.environ["DATABASE_URL"] = db_url
os.environ.setdefault("APP_ENV", "test")
os.environ["DATASETS_DIR"] = str(ROOT / "datasets")
os.environ.setdefault("JWT_SECRET", "test-secret-please-change-32-chars-minimum")
os.environ.setdefault("LLM_PROVIDER", "fake")

password = ENV.get("POSTGRES_PASSWORD", "")
user = ENV.get("POSTGRES_USER", "automatic")
try:
    with psycopg.connect(
        host="localhost", user=user, password=password, dbname="postgres", autocommit=True
    ) as conn:
        exists = conn.execute(
            "SELECT 1 FROM pg_database WHERE datname = 'automatic_test'"
        ).fetchone()
        if not exists:
            conn.execute("CREATE DATABASE automatic_test")
except Exception:
    # The DB may already exist or Docker may not be running; tests will report the real error.
    pass

from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402

Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def auth(client: TestClient):
    response = client.post(
        "/api/v1/auth/anonymous",
        json={"display_name": "Test", "consent_version": "v1"},
    )
    assert response.status_code == 201, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def demo_parcel(client: TestClient, auth):
    response = client.post("/api/v1/demo/parcel", headers=auth)
    assert response.status_code == 201, response.text
    return response.json()

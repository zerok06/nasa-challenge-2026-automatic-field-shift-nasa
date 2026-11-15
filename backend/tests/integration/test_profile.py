from __future__ import annotations


def test_profile_starts_empty_and_can_be_completed(client):
    session = client.post("/api/v1/auth/anonymous", json={})
    assert session.status_code == 201, session.text
    token = session.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    assert session.json()["user"]["display_name"] is None
    assert session.json()["user"]["onboarding_completed_at"] is None
    assert session.json()["user"]["consent_version"] is None

    profile = {
        "audio": True,
        "experience": "first",
        "home": {"lat": -17.19, "lon": -70.93, "district": "Moquegua"},
    }
    updated = client.patch(
        "/api/v1/auth/me",
        headers=headers,
        json={
            "display_name": "Juan",
            "locale": "es-PE",
            "profile": profile,
            "onboarding_completed": True,
            "consent_version": "v1",
        },
    )
    assert updated.status_code == 200, updated.text
    user = updated.json()["user"]
    assert user["display_name"] == "Juan"
    assert user["profile"] == profile
    assert user["onboarding_completed_at"] is not None
    assert user["consent_version"] == "v1"

    fetched = client.get("/api/v1/auth/me", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["user"]["profile"] == profile


def test_profile_can_be_updated_without_losing_onboarding(client, auth):
    first = client.patch(
        "/api/v1/auth/me",
        headers=auth,
        json={
            "display_name": "María",
            "locale": "es-PE",
            "profile": {"audio": True},
            "onboarding_completed": True,
        },
    )
    assert first.status_code == 200
    completed_at = first.json()["user"]["onboarding_completed_at"]

    second = client.patch(
        "/api/v1/auth/me",
        headers=auth,
        json={
            "display_name": "María",
            "locale": "qu-PE",
            "profile": {"audio": False},
            "onboarding_completed": True,
        },
    )
    assert second.status_code == 200
    assert second.json()["user"]["locale"] == "qu-PE"
    assert second.json()["user"]["profile"] == {"audio": False}
    assert second.json()["user"]["onboarding_completed_at"] == completed_at

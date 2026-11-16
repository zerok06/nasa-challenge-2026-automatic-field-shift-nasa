from __future__ import annotations

import pytest

from app.use_cases import terrain
from app.use_cases.terrain import TerrainUnavailable, fetch_terrain, sample_grid


def test_sample_grid_has_nine_points_and_center():
    points = sample_grid(-17.19, -70.93)
    assert len(points) == 9
    assert points[4][0] == pytest.approx(-17.19, abs=1e-6)
    assert points[4][1] == pytest.approx(-70.93, abs=1e-6)


def test_fetch_terrain_computes_slope_from_srtm(monkeypatch):
    def fake_json(url, params):
        assert "srtm90m" in url
        # South to north slope: +1 m per ~90 m step.
        elevations = [100 + row for row in (-1, 0, 1) for _ in range(3)]
        return {"results": [{"elevation": value} for value in elevations]}

    monkeypatch.setattr(terrain, "_get_json", fake_json)
    payload = fetch_terrain(-17.19, -70.93)

    assert payload["source"] == "srtm90m"
    assert payload["elevation_m"] == 100.0
    assert payload["slope_pct"] is not None
    expected = 1.0 / (terrain._SAMPLE_STEP_DEG * 111_320.0) * 100
    assert payload["slope_pct"] == pytest.approx(expected, abs=0.2)
    assert payload["slope_class"] in {"flat", "gentle"}


def test_fetch_terrain_falls_back_to_copernicus(monkeypatch):
    calls: list[str] = []

    def fake_json(url, params):
        calls.append(url)
        if "opentopodata" in url:
            raise RuntimeError("rate limited")
        return {"elevation": [100.0] * 9}

    monkeypatch.setattr(terrain, "_get_json", fake_json)
    payload = fetch_terrain(-17.19, -70.93)

    assert payload["source"] == "copernicus_dem_glo90"
    assert payload["elevation_m"] == 100.0
    assert payload["slope_pct"] == 0.0
    assert calls[0].startswith(terrain.SRTM_URL)
    assert calls[1].startswith(terrain.OPEN_METEO_ELEVATION_URL)


def test_fetch_terrain_fails_when_both_providers_fail(monkeypatch):
    monkeypatch.setattr(
        terrain,
        "_get_json",
        lambda url, params: (_ for _ in ()).throw(RuntimeError("down")),
    )
    with pytest.raises(TerrainUnavailable):
        fetch_terrain(-17.19, -70.93)

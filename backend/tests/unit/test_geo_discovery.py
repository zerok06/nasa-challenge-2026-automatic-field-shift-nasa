from __future__ import annotations

from app.api.v1.geo import discover_sources, discovery_cell


def test_discovery_cell_is_stable() -> None:
    assert discovery_cell(-17.19, -70.93) == (-17.0, -71.0)
    assert discovery_cell(-17.4, -70.6) == (-17.5, -70.5)


def test_discovery_reports_honest_unavailable_sources() -> None:
    result = discover_sources(-17.19, -70.93, live=False, use_cache=False)
    by_id = {source["id"]: source for source in result["sources"]}
    assert by_id["nasa_power"]["status"] == "available"
    assert by_id["gibs_imerg"]["status"] == "available"
    assert by_id["soil_local"]["status"] == "unavailable"
    assert by_id["soil_local"]["reason"] == "no_local_soil_catalog"
    assert by_id["market_local"]["reason"] == "no_local_price_feed"
    assert result["cell"]["size_deg"] == 0.5


def test_discovery_marks_probe_failure() -> None:
    def broken_probe(source_id: str, lat: float, lon: float) -> bool:
        raise RuntimeError("network down")

    result = discover_sources(4.6, -74.1, live=True, probe=broken_probe, use_cache=False)
    by_id = {source["id"]: source for source in result["sources"]}
    assert by_id["nasa_power"]["status"] == "error"
    assert by_id["nasa_power"]["reason"] == "probe_failed"
    assert by_id["soil_local"]["status"] == "unavailable"

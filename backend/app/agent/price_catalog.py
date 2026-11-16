from __future__ import annotations

import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any


# Inverted CATALOG_ID_MAP: English DB id -> list of Spanish catalog ids.
# CATALOG_ID_MAP lives in seed.py (catalog Spanish -> DB English).  Several
# DB ids map to a single catalog id (1:1), but a few map to two
# (corn -> maiz_amilaceo, maiz_choclo).  The list preserves map order so
# callers that need a deterministic tie-break get it for free.
_INVERTED_CATALOG: dict[str, list[str]] = {}
try:
    from app.use_cases.seed import CATALOG_ID_MAP
    for _cat, _db in CATALOG_ID_MAP.items():
        _INVERTED_CATALOG.setdefault(_db, []).append(_cat)
except ImportError:  # pragma: no cover - seed.py always present in backend
    pass


@lru_cache(maxsize=1)
def _load_catalog() -> dict[str, Any]:
    path = Path(__file__).resolve().parents[3] / "catalogo_moquegua_v0_2_5.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def list_price_references() -> list[dict[str, Any]]:
    """Return the source price rows for API and offline catalog consumers."""
    agriculture = _load_catalog().get("historico_agropecuario", {})
    rows = agriculture.get("precios_chacra_2025", [])
    if not isinstance(rows, list):
        return []
    return [
        {**row, "crop_id": row.get("cultivo_id")}
        for row in rows
        if isinstance(row, dict)
    ]


def _same(left: str | None, right: str | None) -> bool:
    return bool(left and right and _normalize(left) == _normalize(right))


def _normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value).casefold().strip()
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def _province_for_district(catalog: dict[str, Any], district: str | None) -> str | None:
    """Resolve a district's province so a province price is not treated as foreign."""
    if not district:
        return None
    territory = catalog.get("territorio") or {}
    for entry in territory.get("distritos", []) or []:
        if _same(entry.get("distrito"), district):
            return entry.get("provincia")
    rows = (catalog.get("historico_agropecuario") or {}).get("precios_chacra_2025", [])
    for row in rows:
        if (
            row.get("nivel") == "distrito"
            and _same(row.get("distrito"), district)
            and row.get("provincia")
        ):
            return row.get("provincia")
    return None


def _resolve_catalog_ids(crop_id: str) -> list[str]:
    """Return the catalog (Spanish) id(s) that correspond to a DB crop id.

    If *crop_id* is already a catalog id (e.g. ``"aji"``) it is returned
    directly.  If it is a DB English id (e.g. ``"chili"``) the inverted
    ``CATALOG_ID_MAP`` is consulted.  For ids that map to two catalog ids
    (``corn`` → ``maiz_amilaceo``, ``maiz_choclo``) both are returned in
    map order so the caller can prefer the first one when both have a
    reference.
    """
    if crop_id in _INVERTED_CATALOG:
        return _INVERTED_CATALOG[crop_id]
    # Already a catalog id (or unknown) – use as-is.
    return [crop_id]


def _crop_match(
    catalog: dict[str, Any], crop_id: str
) -> tuple[dict[str, Any] | None, str]:
    """Find a catalog crop entry by id or name, returning (crop, canonical_id)."""
    for item in catalog.get("cultivos", []):
        if _normalize(str(item.get("id", ""))) == _normalize(crop_id) or _normalize(
            str(item.get("nombre", ""))
        ) == _normalize(crop_id):
            return item, str(item.get("id"))
    return None, crop_id


def find_price_reference(
    crop_id: str, district: str | None, allow_regional: bool = False
) -> dict[str, Any] | None:
    """Return the best editable catalog price for a crop and parcel district.

    Strict by default: never quotes a foreign province as if it were local.
    With ``allow_regional=True`` it falls back to the department row or the
    crop's historical reference, explicitly labelled as regional.
    """
    catalog = _load_catalog()
    # Resolve DB English id to catalog Spanish id(s) first.
    candidates = _resolve_catalog_ids(crop_id)
    crop: dict[str, Any] | None = None
    canonical_crop_id = crop_id
    for cand in candidates:
        crop, canonical_crop_id = _crop_match(catalog, cand)
        if crop is not None:
            break
    # If no crop entry was found, try the original id as a last resort.
    if crop is None:
        crop, canonical_crop_id = _crop_match(catalog, crop_id)
    if crop is None:
        return None
    return _find_reference_for_crop(
        catalog, crop, canonical_crop_id, district, allow_regional=allow_regional
    )


def _find_reference_for_crop(
    catalog: dict[str, Any],
    crop: dict[str, Any],
    canonical_crop_id: str,
    district: str | None,
    allow_regional: bool = False,
) -> dict[str, Any] | None:
    agriculture = catalog.get("historico_agropecuario", {})
    prices = [
        row
        for row in agriculture.get("precios_chacra_2025", [])
        if row.get("cultivo_id") == canonical_crop_id
        and isinstance(row.get("precio_chacra", {}).get("valor"), (int, float))
    ]
    # When a DB id maps to two catalog ids (e.g. corn → maiz_amilaceo,
    # maiz_choclo), include price rows for both so the district/province
    # match can pick the most relevant one.
    extra_ids = _resolve_catalog_ids(canonical_crop_id)
    if len(extra_ids) > 1:
        extra_prices = [
            row
            for row in agriculture.get("precios_chacra_2025", [])
            if row.get("cultivo_id") in extra_ids[1:]
            and isinstance(row.get("precio_chacra", {}).get("valor"), (int, float))
        ]
        prices = prices + extra_prices

    district_rows = [row for row in prices if row.get("nivel") == "distrito"]
    exact = next((row for row in district_rows if _same(row.get("distrito"), district)), None)
    if exact:
        return _format_reference(exact)
    if district:
        # Use the price of the parcel's own province. Do not fall back to a
        # different province or to the department: that would quote a foreign
        # market as if it were local.
        province = _province_for_district(catalog, district)
        if province:
            same_prov = next(
                (
                    row
                    for row in prices
                    if row.get("nivel") == "provincia"
                    and _same(row.get("provincia"), province)
                ),
                None,
            )
            if same_prov:
                return _format_reference(same_prov)
        if not allow_regional:
            return None
        regional = next(
            (
                row
                for row in prices
                if row.get("nivel") == "departamento"
                and _same(row.get("departamento"), "Moquegua")
            ),
            None,
        )
        if regional:
            reference = _format_reference(regional)
            reference["scope"] = "departamento"
            reference["is_local"] = False
            return reference
        return _historical_reference(crop, canonical_crop_id, district)
    broader = next(
        (row for row in prices if row.get("nivel") in {"provincia", "departamento"}),
        None,
    )
    if broader:
        return _format_reference(broader)

    historical = crop.get("referencias_historicas_distritales", [])
    local = next(
        (
            row
            for row in historical
            if _same(row.get("distrito"), district)
            and isinstance(row.get("precio_chacra", {}).get("valor"), (int, float))
            and row.get("estado") not in {"pendiente_cotejo", "transcrito_pendiente_cotejo_pdf"}
        ),
        None,
    )
    if local:
        return {
            "crop_id": canonical_crop_id,
            "price_pen_kg": local["precio_chacra"]["valor"],
            "unit": local["precio_chacra"].get("unidad", "PEN/kg"),
            "year": local.get("periodo"),
            "place": local.get("distrito"),
            "scope": "distrito",
            "source_id": local.get("fuente_id"),
            "status": local.get("estado"),
            "editable_assumption": True,
        }
    return None


def _historical_reference(
    crop: dict[str, Any], canonical_crop_id: str, district: str | None
) -> dict[str, Any] | None:
    """Last-resort reference: the crop's historical price, clearly regional."""
    historical = crop.get("precio_historico") or {}
    value = historical.get("valor")
    if not isinstance(value, (int, float)):
        return None
    return {
        "crop_id": canonical_crop_id,
        "price_pen_kg": float(value),
        "unit": historical.get("unidad", "PEN/kg"),
        "year": historical.get("periodo"),
        "place": historical.get("ambito") or "Moquegua",
        "scope": "historico",
        "source_id": historical.get("fuente_id"),
        "status": "referencia_historica",
        "note": historical.get("nota"),
        "is_local": False,
        "editable_assumption": True,
    }


def find_mentioned_price_reference(
    message: str, district: str | None, allow_regional: bool = False
) -> tuple[str | None, dict[str, Any] | None]:
    """Find a catalog crop named by the farmer, then return its local price."""
    catalog = _load_catalog()
    normalized_message = _normalize(message)
    for crop in catalog.get("cultivos", []):
        crop_id = str(crop.get("id", ""))
        names = (crop_id.replace("_", " "), str(crop.get("nombre", "")))
        # Also match against the English DB id so the agent can quote prices
        # when the farmer names the crop in English (e.g. "chili" → aji).
        inverted = _INVERTED_CATALOG.get(crop_id, [])
        for db_alias in inverted:
            names = names + (db_alias,)
        if any(
            re.search(rf"\b{re.escape(_normalize(name))}\b", normalized_message)
            for name in names
            if name.strip()
        ):
            return crop_id, find_price_reference(
                crop_id, district, allow_regional=allow_regional
            )
    return None, None


def _format_reference(row: dict[str, Any]) -> dict[str, Any]:
    level = row.get("nivel")
    place = row.get("distrito") if level == "distrito" else row.get("provincia") or row.get("departamento")
    return {
        "crop_id": row.get("cultivo_id"),
        "price_pen_kg": row["precio_chacra"]["valor"],
        "unit": row["precio_chacra"].get("unidad", "PEN/kg"),
        "year": row.get("periodo"),
        "place": place,
        "scope": level,
        "source_id": row.get("fuente_id"),
        "is_local": level in {"distrito", "provincia"},
        "status": row.get("estado"),
        "editable_assumption": row.get("uso") == "supuesto_editable_demo",
    }

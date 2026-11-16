from __future__ import annotations

import math
from datetime import UTC, date, datetime
from typing import Any

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models.entities import AnalysisRun, Parcel, SavedDecision, User
from app.schemas.agent import (
    SavedPlanIn,
    SavedPlanOut,
    SavedPlanReviewAlertOut,
    SavedPlanReviewOut,
    SavedPlanSnapshotPlanOut,
)
from app.schemas.analysis import ComparisonOut, PlanOut
from app.use_cases.comparison import create_comparison

_REVIEW_TOLERANCE_MM = 0.5
_REVIEW_TOLERANCE_PEN = 1.0


def _number(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _plan_snapshot(plan: PlanOut) -> dict[str, Any]:
    return {
        "plan_id": plan.plan_id,
        "label": plan.label,
        "kind": plan.kind,
        "status": plan.status,
        "crop_sequence": list(plan.crop_sequence),
        "water": plan.water.model_dump(mode="json"),
        "economics": plan.economics.model_dump(mode="json"),
    }


def _snapshot_plan(value: Any) -> SavedPlanSnapshotPlanOut | None:
    if not isinstance(value, dict):
        return None
    try:
        return SavedPlanSnapshotPlanOut.model_validate(value)
    except ValidationError:
        return None


def saved_plan_out(row: SavedDecision) -> SavedPlanOut:
    snapshot = row.snapshot_json if isinstance(row.snapshot_json, dict) else {}
    return SavedPlanOut(
        id=row.id,
        parcel_id=row.parcel_id,
        name=row.name,
        status=row.status,
        rotation_plan_id=row.rotation_plan_id,
        analysis_run_id=row.analysis_run_id,
        comparison_id=row.comparison_id or row.analysis_run_id,
        preferred_plan_id=row.preferred_plan_id or row.rotation_plan_id,
        fallback_plan_id=row.fallback_plan_id,
        preferred=_snapshot_plan(snapshot.get("preferred")),
        fallback=_snapshot_plan(snapshot.get("fallback")),
        thresholds=row.thresholds_json if isinstance(row.thresholds_json, dict) else {},
        reviewed_at=row.reviewed_at,
        created_at=row.created_at,
    )


def save_saved_plan(
    db: Session,
    parcel: Parcel,
    payload: SavedPlanIn,
) -> SavedPlanOut:
    comparison_id = payload.comparison_id or payload.analysis_run_id
    preferred_id = payload.preferred_plan_id or payload.rotation_plan_id
    if not comparison_id:
        raise ValueError("Falta la comparación de origen")
    if not preferred_id:
        raise ValueError("Falta el plan preferido")

    run = db.get(AnalysisRun, comparison_id)
    if run is None or run.parcel_id != parcel.id:
        raise LookupError("comparison_not_found")
    try:
        comparison = ComparisonOut.model_validate(run.results_json)
    except ValidationError as exc:
        raise ValueError("La comparación guardada no se puede leer") from exc
    plans = {plan.plan_id: plan for plan in comparison.plans}

    preferred = plans.get(preferred_id)
    if preferred is None:
        raise ValueError("El plan preferido no pertenece a la comparación")
    fallback: PlanOut | None = None
    if payload.fallback_plan_id:
        if payload.fallback_plan_id == preferred_id:
            raise ValueError("La alternativa debe ser distinta del plan preferido")
        fallback = plans.get(payload.fallback_plan_id)
        if fallback is None:
            raise ValueError("La alternativa no pertenece a la comparación")

    snapshot = {
        "version": 1,
        "comparison_id": comparison.comparison_id,
        "parcel_id": comparison.parcel_id,
        "analysis_period": {
            key: value.isoformat() if isinstance(value, date) else value
            for key, value in comparison.analysis_period.items()
        },
        "preferred": _plan_snapshot(preferred),
        "fallback": _plan_snapshot(fallback) if fallback is not None else None,
        "saved_at": datetime.now(UTC).isoformat(),
    }
    thresholds = {
        "available_mm": preferred.water.available_mm,
        "deficit_mm": preferred.water.deficit_mm,
        "margin_pen": preferred.economics.margin_pen,
        "feasibility": preferred.water.feasibility,
        "crop_sequence": list(preferred.crop_sequence),
        "kind": preferred.kind,
    }

    row = SavedDecision(
        parcel_id=parcel.id,
        rotation_plan_id=preferred.plan_id,
        analysis_run_id=comparison.comparison_id,
        comparison_id=comparison.comparison_id,
        preferred_plan_id=preferred.plan_id,
        fallback_plan_id=fallback.plan_id if fallback is not None else None,
        snapshot_json=snapshot,
        thresholds_json=thresholds,
        name=payload.name,
        status="saved",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return saved_plan_out(row)


def _current_comparison(
    db: Session,
    user: User,
    parcel: Parcel,
    snapshot: dict[str, Any],
    comparison_id: str | None,
) -> ComparisonOut:
    if comparison_id:
        run = db.get(AnalysisRun, comparison_id)
        if run is None or run.parcel_id != parcel.id:
            raise LookupError("comparison_not_found")
        try:
            return ComparisonOut.model_validate(run.results_json)
        except ValidationError as exc:
            raise ValueError("La comparación guardada no se puede leer") from exc

    period = snapshot.get("analysis_period")
    start: date | None = None
    end: date | None = None
    if isinstance(period, dict):
        try:
            start = date.fromisoformat(str(period.get("start")))
            end = date.fromisoformat(str(period.get("end")))
        except (TypeError, ValueError):
            start = None
            end = None
    if start is None or end is None or end < start:
        year = date.today().year + 1
        start, end = date(year, 1, 1), date(year, 12, 31)
    return create_comparison(db, user, parcel, start, end)


def _match_plan(
    comparison: ComparisonOut, saved_preferred: dict[str, Any]
) -> PlanOut | None:
    sequence = saved_preferred.get("crop_sequence")
    wanted = list(sequence) if isinstance(sequence, list) else []
    candidates = [plan for plan in comparison.plans if list(plan.crop_sequence) == wanted]
    kind = saved_preferred.get("kind")
    if kind:
        exact = [plan for plan in candidates if plan.kind == kind]
        if exact:
            return exact[0]
    if candidates:
        return candidates[0]
    label = saved_preferred.get("label")
    if label:
        return next((plan for plan in comparison.plans if plan.label == label), None)
    return None


def review_saved_plan(
    db: Session,
    user: User,
    saved_plan_id: str,
    comparison_id: str | None = None,
) -> SavedPlanReviewOut:
    row = db.get(SavedDecision, saved_plan_id)
    if row is None:
        raise LookupError("saved_plan_not_found")
    parcel = db.get(Parcel, row.parcel_id)
    if parcel is None or parcel.owner_user_id != user.id:
        raise LookupError("saved_plan_not_found")

    snapshot = row.snapshot_json if isinstance(row.snapshot_json, dict) else {}
    saved_preferred = snapshot.get("preferred")
    if not isinstance(saved_preferred, dict) and row.analysis_run_id and row.rotation_plan_id:
        run = db.get(AnalysisRun, row.analysis_run_id)
        if run is not None and run.parcel_id == row.parcel_id:
            try:
                comparison = ComparisonOut.model_validate(run.results_json)
            except ValidationError:
                comparison = None
            legacy = (
                next(
                    (plan for plan in comparison.plans if plan.plan_id == row.rotation_plan_id),
                    None,
                )
                if comparison is not None
                else None
            )
            if legacy is not None:
                saved_preferred = _plan_snapshot(legacy)
                snapshot = {
                    "version": 1,
                    "comparison_id": comparison.comparison_id,
                    "parcel_id": comparison.parcel_id,
                    "analysis_period": {
                        key: value.isoformat() if isinstance(value, date) else value
                        for key, value in comparison.analysis_period.items()
                    },
                    "preferred": saved_preferred,
                    "fallback": None,
                    "saved_at": row.created_at.isoformat() if row.created_at else None,
                }
    if not isinstance(saved_preferred, dict):
        raise TypeError("El plan guardado no tiene una foto de condiciones")

    current = _current_comparison(db, user, parcel, snapshot, comparison_id)
    current_plan = _match_plan(current, saved_preferred)

    saved_water = saved_preferred.get("water") if isinstance(saved_preferred.get("water"), dict) else {}
    saved_economics = (
        saved_preferred.get("economics")
        if isinstance(saved_preferred.get("economics"), dict)
        else {}
    )
    saved_available = _number(saved_water.get("available_mm"))
    saved_deficit = _number(saved_water.get("deficit_mm"))
    saved_margin = _number(saved_economics.get("margin_pen"))
    saved_feasibility = saved_water.get("feasibility")

    alerts: list[SavedPlanReviewAlertOut] = []
    current_available: float | None = None
    current_deficit: float | None = None
    current_margin: float | None = None

    if current_plan is None:
        alerts.append(
            SavedPlanReviewAlertOut(
                code="plan_no_longer_available",
                severity="warning",
                message=(
                    "La rotación guardada ya no aparece entre las alternativas actuales. "
                    "Vuelve a comparar antes de decidir."
                ),
            )
        )
    else:
        current_available = _number(current_plan.water.available_mm)
        current_deficit = _number(current_plan.water.deficit_mm)
        current_margin = _number(current_plan.economics.margin_pen)
        current_feasibility = current_plan.water.feasibility

        if (
            saved_available is not None
            and current_available is not None
            and current_available < saved_available - _REVIEW_TOLERANCE_MM
        ):
            alerts.append(
                SavedPlanReviewAlertOut(
                    code="water_below_saved",
                    severity="warning",
                    message=(
                        f"El agua disponible bajó de {saved_available:.0f} mm "
                        f"a {current_available:.0f} mm desde que guardaste el plan."
                    ),
                )
            )
        if saved_feasibility != "deficit" and current_feasibility == "deficit":
            alerts.append(
                SavedPlanReviewAlertOut(
                    code="deficit_appeared",
                    severity="critical",
                    message=(
                        "El plan preferido ahora tiene déficit de agua. "
                        "Revisa la alternativa antes de sembrar."
                    ),
                )
            )
        elif (
            saved_deficit is not None
            and current_deficit is not None
            and current_deficit > saved_deficit + _REVIEW_TOLERANCE_MM
            and current_feasibility == "deficit"
        ):
            alerts.append(
                SavedPlanReviewAlertOut(
                    code="deficit_appeared",
                    severity="warning",
                    message=(
                        f"El déficit de agua subió de {saved_deficit:.0f} mm "
                        f"a {current_deficit:.0f} mm."
                    ),
                )
            )
        if (
            saved_margin is not None
            and current_margin is not None
            and current_margin < saved_margin - max(_REVIEW_TOLERANCE_PEN, abs(saved_margin) * 0.05)
        ):
            alerts.append(
                SavedPlanReviewAlertOut(
                    code="margin_below_saved",
                    severity="warning",
                    message=(
                        f"La ganancia estimada bajó de S/ {saved_margin:.0f} "
                        f"a S/ {current_margin:.0f}."
                    ),
                )
            )
        if saved_preferred.get("status") != current_plan.status and current_plan.status == "invalid":
            alerts.append(
                SavedPlanReviewAlertOut(
                    code="status_changed",
                    severity="warning",
                    message="El plan preferido pasó a no recomendado con los datos actuales.",
                )
            )

    checked_at = datetime.now(UTC)
    row.reviewed_at = checked_at
    db.commit()
    db.refresh(row)

    return SavedPlanReviewOut(
        saved_plan_id=row.id,
        changed=bool(alerts),
        checked_at=checked_at,
        alerts=alerts,
        saved_preferred=_snapshot_plan(saved_preferred),
        current_preferred=_plan_snapshot(current_plan) if current_plan is not None else None,
        saved_available_mm=saved_available,
        current_available_mm=current_available,
        saved_margin_pen=saved_margin,
        current_margin_pen=current_margin,
    )

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    actions,
    agent,
    auth,
    bundles,
    catalog,
    comparisons,
    demo,
    feedback,
    geo,
    health,
    indicators,
    parcels,
)

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(auth.router)
router.include_router(parcels.router)
router.include_router(demo.router)
router.include_router(catalog.router)
router.include_router(indicators.router)
router.include_router(comparisons.router)
router.include_router(agent.router)
router.include_router(actions.router)
router.include_router(geo.router)
router.include_router(feedback.router)
router.include_router(bundles.router)

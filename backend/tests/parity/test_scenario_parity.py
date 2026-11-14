from __future__ import annotations

import json
from pathlib import Path

from services.scenario import apply_scenario_values

ROOT = Path(__file__).resolve().parents[3]
CASES = json.loads((ROOT / "tests" / "parity" / "scenario_cases.json").read_text(encoding="utf-8"))


def test_python_matches_shared_scenario_fixtures():
    for case in CASES:
        result = apply_scenario_values(**case["input"])
        assert result == case["expected"], case["name"]

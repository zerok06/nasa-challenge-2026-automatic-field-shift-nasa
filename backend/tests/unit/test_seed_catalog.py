from app.use_cases.seed import _catalog_crop_rows, _duration_days


def test_duration_in_months_is_converted_to_days():
    # Maíz amiláceo: 8.5 meses must not become an 8-day crop.
    assert _duration_days(8.5, "meses") == 259


def test_duration_in_days_and_weeks_is_normalized():
    assert _duration_days(220, "dias") == 220
    assert _duration_days(12, "semanas") == 84


def test_missing_or_invalid_duration_returns_none():
    assert _duration_days(None, "dias") is None
    assert _duration_days("n/a", "dias") is None


def test_catalog_rows_have_one_entry_per_app_crop():
    rows = _catalog_crop_rows()

    db_ids = [db_id for db_id, _catalog_id, _cultivo in rows]
    assert len(db_ids) == len(set(db_ids))


def test_duplicate_catalog_maize_entries_collapse_into_one_corn_crop():
    rows = _catalog_crop_rows()
    corn_rows = [row for row in rows if row[0] == "corn"]

    assert len(corn_rows) == 1
    # The first catalog entry wins (maíz amiláceo).
    assert corn_rows[0][1] == "maiz_amilaceo"

from app.agent.price_catalog import find_price_reference


def test_district_price_wins_when_the_district_has_its_own_row():
    reference = find_price_reference("cebolla", "Moquegua")

    assert reference is not None
    assert reference["price_pen_kg"] == 0.9
    assert reference["scope"] == "distrito"
    assert reference["place"] == "Moquegua"


def test_district_without_own_row_uses_its_province():
    # Ají has no district row for Moquegua, but Moquegua district belongs to
    # Mariscal Nieto, which does have a provincial reference.
    reference = find_price_reference("aji", "Moquegua")

    assert reference is not None
    assert reference["price_pen_kg"] == 2
    assert reference["scope"] == "provincia"
    assert reference["place"] == "Mariscal Nieto"


def test_price_never_leaks_from_a_foreign_province():
    # Ilo is a different province; the Mariscal Nieto price must not be quoted
    # as if it were local.
    assert find_price_reference("aji", "Ilo") is None
    assert find_price_reference("aji", "El Algarrobal") is None


def test_unknown_district_does_not_fall_back_to_the_department():
    assert find_price_reference("aji", "Lima") is None


def test_without_a_district_the_broadest_reference_is_used():
    reference = find_price_reference("papa", None)

    assert reference is not None
    assert reference["scope"] == "provincia"


def test_unknown_crop_returns_none():
    assert find_price_reference("kiwicha", "Moquegua") is None


def test_catalog_name_is_accepted_as_well_as_the_id():
    by_id = find_price_reference("aji", "Moquegua")
    by_name = find_price_reference("Ají", "Moquegua")

    assert by_id is not None
    assert by_name is not None
    assert by_id["price_pen_kg"] == by_name["price_pen_kg"]
    assert by_id["crop_id"] == "aji"


# ── T1: English DB id alias tests ──────────────────────────────────────

def test_chili_resolves_to_aji_catalog_id():
    reference = find_price_reference("chili", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "aji"
    assert reference["price_pen_kg"] == 2
    assert reference["scope"] == "provincia"


def test_corn_resolves_to_maiz_amilaceo_first():
    reference = find_price_reference("corn", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] in ("maiz_amilaceo", "maiz_choclo")


def test_carrot_resolves_to_zanahoria():
    reference = find_price_reference("carrot", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "zanahoria"


def test_lettuce_resolves_to_lechuga():
    reference = find_price_reference("lettuce", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "lechuga"


def test_beetroot_resolves_to_beterraga():
    reference = find_price_reference("beetroot", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "beterraga"


def test_sweet_potato_resolves_to_camote():
    reference = find_price_reference("sweet_potato", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "camote"


def test_green_pea_resolves_to_arveja_verde():
    reference = find_price_reference("green_pea", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "arveja_verde"


def test_pickle_cucumber_resolves_to_pepinillo():
    reference = find_price_reference("pickle_cucumber", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "pepinillo"


def test_cauliflower_resolves_to_coliflor():
    reference = find_price_reference("cauliflower", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "coliflor"


def test_onion_resolves_to_cebolla():
    reference = find_price_reference("onion", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "cebolla"
    assert reference["price_pen_kg"] == 0.9


def test_potato_resolves_to_papa():
    reference = find_price_reference("potato", None)
    assert reference is not None
    assert reference["crop_id"] == "papa"


def test_pumpkin_resolves_to_zapallo():
    reference = find_price_reference("pumpkin", "Moquegua")
    assert reference is not None
    assert reference["crop_id"] == "zapallo"


def test_english_id_with_no_catalog_match_returns_none():
    # A DB id that has no catalog counterpart should still return None.
    assert find_price_reference("kiwicha_db", "Moquegua") is None

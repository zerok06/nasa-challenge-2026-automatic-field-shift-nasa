from __future__ import annotations

from app.db.session import SessionLocal, init_db
from app.use_cases.seed import seed_reference_data


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        seed_reference_data(db)
        print("seed ok")
    finally:
        db.close()


if __name__ == "__main__":
    main()

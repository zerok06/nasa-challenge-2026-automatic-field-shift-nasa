from __future__ import annotations

from app.db.session import init_db


def main() -> None:
    init_db()
    print("db init ok")


if __name__ == "__main__":
    main()

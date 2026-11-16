from __future__ import annotations
import os
from typing import Generator
import psycopg
from psycopg.rows import dict_row
from .models import SCHEMA_SQL


def connect():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required")
    return psycopg.connect(url, row_factory=dict_row)


def get_db() -> Generator:
    connection = connect()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialise_database() -> None:
    with connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute(SCHEMA_SQL)
        connection.commit()

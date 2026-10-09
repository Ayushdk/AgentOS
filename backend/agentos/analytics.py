"""Strict SELECT subset over aggregate views; executed by a separate DB role."""

from datetime import date
from functools import lru_cache

import sqlglot
from sqlalchemy import create_engine, text
from sqlglot import exp

from .auth import require_role
from .config import settings
from .errors import DomainError

VIEWS = {"headcount", "joiners", "joining_trends", "approved_leave"}
FUNCTIONS = {"SUM", "COUNT", "AVG", "MIN", "MAX", "COALESCE", "ROUND"}
REPORTS = {
    "headcount": (
        "SELECT department, value FROM reporting.headcount ORDER BY department",
        "department",
        "Employees",
        "Active employees as of the selected end date; exits on that date excluded.",
    ),
    "joiners": (
        "SELECT department, SUM(value) AS value FROM reporting.joiners GROUP BY department ORDER BY department",
        "department",
        "Employees",
        "Employees joining in the inclusive selected period, including subsequent exits.",
    ),
    "joining_trends": (
        "SELECT month, value FROM reporting.joining_trends ORDER BY month",
        "month",
        "Employees",
        "Join dates grouped by calendar month within the inclusive selected period.",
    ),
    "approved_leave": (
        "SELECT month, value FROM reporting.approved_leave ORDER BY month",
        "month",
        "Working days",
        "Approved working leave days allocated to their calendar month; weekends and holidays excluded.",
    ),
}


def validate_sql(sql):
    if len(sql) > 4000:
        raise DomainError("unsafe_sql", "Query exceeds the allowed length.")
    try:
        trees = sqlglot.parse(sql, read="postgres")
    except sqlglot.errors.ParseError:
        raise DomainError("unsafe_sql", "Query could not be parsed.") from None
    if len(trees) != 1 or not isinstance(trees[0], exp.Select):
        raise DomainError("unsafe_sql", "Exactly one SELECT query is allowed.")
    tree = trees[0]
    # Small auditable grammar; no CTEs, subqueries, set operations, joins, or locking.
    if any(
        tree.find(t)
        for t in (
            exp.CTE,
            exp.Subquery,
            exp.Join,
            exp.Into,
            exp.Lock,
            exp.Command,
            exp.Union,
            exp.Window,
            exp.Offset,
        )
    ):
        raise DomainError("unsafe_sql", "Nested, joining, locking, or write queries are not allowed.")
    tables = list(tree.find_all(exp.Table))
    if len(tables) != 1 or tables[0].db != "reporting" or tables[0].name not in VIEWS or tables[0].catalog:
        raise DomainError("unsafe_sql", "Only one approved aggregate reporting view may be queried.")
    for f in tree.find_all(exp.Func):
        if f.sql_name() not in FUNCTIONS or isinstance(f, exp.Anonymous):
            raise DomainError("unsafe_sql", "Query contains an unapproved function.")
    allowed = {"department", "value", "month"}
    for col in tree.find_all(exp.Column):
        if col.name not in allowed:
            raise DomainError("unsafe_sql", "Query contains an unapproved column.")
    if tree.find(exp.Star):
        raise DomainError("unsafe_sql", "Name the aggregate columns explicitly.")
    # Aliases cannot introduce misleading metric names. Chart values are always numeric.
    for alias in tree.find_all(exp.Alias):
        if alias.alias not in allowed:
            raise DomainError("unsafe_sql", "Use approved output column names.")
    return tree.limit(100).sql(dialect="postgres")


@lru_cache
def reporting_engine():
    return create_engine(settings().analytics_database_url, pool_size=1, max_overflow=1, pool_pre_ping=True)


def query_hr_analytics(ctx, report="headcount", start_date="2026-01-01", end_date="2026-12-31", sql=None):
    require_role(ctx, "hr")
    start, end = date.fromisoformat(start_date), date.fromisoformat(end_date)
    if start > end or (end - start).days > 366 * 5:
        raise DomainError("invalid_period", "Choose an ordered period of five years or less.")
    if report not in REPORTS:
        raise DomainError("report", "Unknown report.")
    template, x, unit, definition = REPORTS[report]
    query = validate_sql(sql or template)
    with reporting_engine().connect() as c:
        with c.begin():
            c.execute(text("SET TRANSACTION READ ONLY"))
            c.execute(text("SET LOCAL statement_timeout='2000ms'"))
            c.execute(text("SET LOCAL search_path=reporting,pg_catalog"))
            for key, value in [
                ("tenant_id", ctx.tenant_id),
                ("start_date", str(start)),
                ("end_date", str(end)),
                ("as_of", str(end)),
            ]:
                c.execute(
                    text("SELECT set_config(:key,:value,true)"), {"key": "agentos." + key, "value": value}
                )
            rows = [dict(r) for r in c.execute(text(query)).mappings().all()]
    if rows:
        keys = set(rows[0])
        if "value" not in keys or not keys.intersection({"department", "month"}):
            raise DomainError("invalid_chart", "Query must return a label column and numeric value.")
        x = "department" if "department" in keys else "month"
        for row in rows:
            if isinstance(row["value"], bool) or not isinstance(row["value"], (int, float)):
                from decimal import Decimal

                if not isinstance(row["value"], Decimal):
                    raise DomainError("invalid_chart", "Values must be numeric.")
                row["value"] = float(row["value"])
    return {
        "rows": rows,
        "chart": {"type": "bar", "x": x, "y": "value", "unit": unit},
        "report": report,
        "period": {"start": str(start), "end": str(end)},
        "definition": definition,
        "query": query,
        "total": sum(r["value"] for r in rows),
        "row_limit": 100,
    }

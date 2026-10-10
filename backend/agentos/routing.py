import calendar
import re
from datetime import datetime

MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"


def extract_dates(value: str) -> list[str]:
    dates = re.findall(r"(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)", value)
    if not dates:
        for day, month, year in re.findall(r"(?<!\d)(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})(?!\d)", value):
            try:
                full_year = f"20{year}" if len(year) == 2 else year
                dates.append(datetime(int(full_year), int(month), int(day)).date().isoformat())
            except ValueError:
                pass
    if not dates:
        month_first = re.search(rf"({MONTHS})\s+(\d{{1,2}})\s*[-–]\s*(\d{{1,2}}),?\s+(\d{{4}})", value, re.I)
        if month_first:
            month = datetime.strptime(month_first[1], "%B").month
            dates = [
                f"{month_first[4]}-{month:02}-{int(month_first[2]):02}",
                f"{month_first[4]}-{month:02}-{int(month_first[3]):02}",
            ]
    if not dates:
        for day, month_name, year in re.findall(rf"(?<!\d)(\d{{1,2}})\s+({MONTHS})\s+(\d{{4}})", value, re.I):
            try:
                dates.append(
                    datetime(int(year), datetime.strptime(month_name, "%B").month, int(day))
                    .date()
                    .isoformat()
                )
            except ValueError:
                pass
    return dates


def route_request(question: str):
    from .model import Plan

    latest = re.split(r"\nEmployee (?:follow-up|clarification):\s*", question, flags=re.I)[-1].strip()
    q = latest.lower()
    context_q = question.lower()
    dates = extract_dates(latest)
    if len(dates) < 2:
        context_dates = extract_dates(question)
        dates = context_dates[-2:] if len(context_dates) >= 2 else dates

    analytics_terms = [
        "headcount",
        "joiners",
        "joining trend",
        "employees joined",
        "employee joined",
        "new hires",
        "new employees",
        "approved leave by",
        "analytics",
    ]
    if any(term in q for term in analytics_terms):
        report = (
            "joining_trends"
            if "trend" in q
            else (
                "joiners"
                if any(term in q for term in ["joiner", "joined", "new hire", "new employee"])
                else ("approved_leave" if "approved leave" in q else "headcount")
            )
        )
        if not dates:
            named = re.search(rf"\b({MONTHS})\s+(20\d{{2}})\b", latest, re.I)
            if named:
                month = datetime.strptime(named[1], "%B").month
                year = int(named[2])
                dates = [
                    f"{year}-{month:02}-01",
                    f"{year}-{month:02}-{calendar.monthrange(year, month)[1]:02}",
                ]
        return Plan(
            intent="analytics",
            query=latest,
            report=report,
            start_date=dates[0] if dates else "2026-01-01",
            end_date=dates[-1] if dates else "2026-12-31",
        )

    leave_action = "leave" in q and any(
        phrase in q
        for phrase in ["prepare", "book", "request", "take leave", "check leave", "need leave", "leave from"]
    )
    asks_calendar = "calendar" in q or "conflict" in q or "meeting" in q
    context_is_leave = "leave" in context_q
    if len(dates) >= 2 and (leave_action or (context_is_leave and not asks_calendar)):
        return Plan(
            intent="leave",
            query=latest,
            start_date=dates[-2],
            end_date=dates[-1],
            leave_type="sick" if "sick" in q else "annual",
            include_calendar=asks_calendar,
        )
    if "balance" in q or (
        "leave" in q
        and any(phrase in q for phrase in ["do i have", "my leave", "i have available", "available to me"])
    ):
        return Plan(intent="balance", query=latest)
    if asks_calendar and len(dates) >= 2:
        return Plan(intent="calendar", query=latest, start_date=dates[-2], end_date=dates[-1])
    if leave_action or asks_calendar or (context_is_leave and q.startswith(("from", "for"))):
        if len(dates) < 2:
            return Plan(
                intent="clarify",
                clarification="Please provide start and end dates including the year, for example 2026-11-16 to 2026-11-20, and annual or sick leave.",
            )
        return Plan(
            intent="calendar" if asks_calendar and not leave_action else "leave",
            query=latest,
            start_date=dates[-2],
            end_date=dates[-1],
            leave_type="sick" if "sick" in q else "annual",
            include_calendar=asks_calendar,
        )
    return Plan(intent="policy", query=latest)

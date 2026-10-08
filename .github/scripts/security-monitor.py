#!/usr/bin/env python3
"""Aggregate a small set of Supabase security/reliability signals for daily QA.

The query returns counts only. It never returns IP addresses, user identifiers,
email addresses, raw URLs, or log messages to GitHub Actions or the QA email.
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "yxmbammlzweasjvpouqn")
TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/analytics/endpoints/logs"

def set_outputs(values: dict[str, str]) -> None:
    output_path = os.environ.get("GITHUB_OUTPUT")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as output:
            for key, value in values.items():
                output.write(f"{key}={value}\n")

def set_summary(status: str, values: dict[str, str], note: str) -> None:
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not summary_path:
        return
    labels = [
        ("Failed sign-ins", "failed_signins"),
        ("Sources with 10+ failed sign-ins", "repeat_failure_sources"),
        ("Rate-limited requests", "rate_limited_requests"),
        ("Sources with 10+ rate limits", "repeat_rate_limit_sources"),
        ("API 5xx responses", "api_5xx"),
        ("Database errors", "db_errors"),
        ("Permission denials", "permission_denials"),
    ]
    with open(summary_path, "a", encoding="utf-8") as summary:
        summary.write("### Supabase security activity (last 24 hours)\n\n")
        summary.write(f"**Status:** {status}\n\n")
        summary.write("| Signal | Count |\n|---|---:|\n")
        for label, key in labels:
            summary.write(f"| {label} | {values.get(key, 'N/A')} |\n")
        summary.write(f"\n{note}\n")

def safe_api_error(value: object) -> str:
    """Keep API diagnostics useful without leaking tokens or unsafe markup."""
    if isinstance(value, dict):
        value = value.get("message") or value.get("error") or value.get("code") or "unknown API error"
    detail = " ".join(str(value).split())
    if TOKEN:
        detail = detail.replace(TOKEN, "[redacted]")
    detail = re.sub(r"[^A-Za-z0-9 _.,:()/+\-]", " ", detail)
    detail = " ".join(detail.split())[:240]
    return detail or "unknown API error"

def finish(status: str, *, error: str = "", counts: dict[str, int] | None = None) -> int:
    safe_counts = counts or {}
    values = {
        "security_status": status,
        "security_error": error,
        **{key: str(safe_counts.get(key, "N/A")) for key in (
            "failed_signins",
            "repeat_failure_sources",
            "rate_limited_requests",
            "repeat_rate_limit_sources",
            "api_5xx",
            "db_errors",
            "permission_denials",
        )},
    }
    set_outputs(values)
    if status == "not_configured":
        note = "Add a project-scoped, read-only Supabase Management API token as the SUPABASE_ACCESS_TOKEN GitHub Actions secret."
    elif status == "unavailable":
        note = f"Log query unavailable ({error}). No conclusion can be drawn about activity."
    elif status == "review":
        note = "Threshold reached. This is an indicator for human review, not proof of an attack."
    else:
        note = "No configured review threshold was reached. This is a log-based signal check, not proof that all activity is safe."
    set_summary(status, values, note)
    print(f"Supabase security activity scan: {status}" + (f" ({error})" if error else ""))
    return 0

def main() -> int:
    if not TOKEN:
        return finish("not_configured")

    end = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    start = end - timedelta(hours=24)
    start_sql = start.strftime("%Y-%m-%d %H:%M:%S")
    end_sql = end.strftime("%Y-%m-%d %H:%M:%S")
    sql = f"""
    WITH per_client AS (
      SELECT
        log_attributes['request.headers.cf_connecting_ip'] AS client_ip,
        countIf(
          positionCaseInsensitive(log_attributes['request.path'], '/auth/v1/token') > 0
          AND toInt32OrZero(log_attributes['response.status_code']) IN (400, 401, 403)
        ) AS failed_signins,
        countIf(toInt32OrZero(log_attributes['response.status_code']) = 429) AS rate_limited
      FROM logs
      WHERE source = 'edge_logs'
        AND timestamp >= toDateTime64('{start_sql}', 3, 'UTC')
        AND timestamp < toDateTime64('{end_sql}', 3, 'UTC')
      GROUP BY client_ip
    ),
    per_client_summary AS (
      SELECT
        sum(failed_signins) AS failed_signins,
        countIf(client_ip != '' AND failed_signins >= 10) AS repeat_failure_sources,
        sum(rate_limited) AS rate_limited_requests,
        countIf(client_ip != '' AND rate_limited >= 10) AS repeat_rate_limit_sources
      FROM per_client
    ),
    service_errors AS (
      SELECT
        countIf(
          source = 'edge_logs'
          AND toInt32OrZero(log_attributes['response.status_code']) BETWEEN 500 AND 599
        ) AS api_5xx,
        countIf(
          source = 'postgres_logs'
          AND log_attributes['parsed.error_severity'] IN ('ERROR', 'FATAL', 'PANIC')
          AND log_attributes['parsed.sql_state_code'] NOT IN ('25006', '53100', '57P03')
        ) AS db_errors,
        countIf(
          source = 'postgres_logs'
          AND log_attributes['parsed.sql_state_code'] = '42501'
        ) AS permission_denials
      FROM logs
      WHERE source IN ('edge_logs', 'postgres_logs')
        AND timestamp >= toDateTime64('{start_sql}', 3, 'UTC')
        AND timestamp < toDateTime64('{end_sql}', 3, 'UTC')
    )
    SELECT
      per_client_summary.failed_signins AS failed_signins,
      per_client_summary.repeat_failure_sources AS repeat_failure_sources,
      per_client_summary.rate_limited_requests AS rate_limited_requests,
      per_client_summary.repeat_rate_limit_sources AS repeat_rate_limit_sources,
      service_errors.api_5xx AS api_5xx,
      service_errors.db_errors AS db_errors,
      service_errors.permission_denials AS permission_denials
    FROM per_client_summary
    CROSS JOIN service_errors    """
    params = urlencode({
        "sql": sql,
        "iso_timestamp_start": start.isoformat().replace("+00:00", "Z"),
        "iso_timestamp_end": end.isoformat().replace("+00:00", "Z"),
    })
    request = Request(
        f"{API_URL}?{params}",
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=45) as response:
            if response.status != 200:
                return finish("unavailable", error=f"HTTP {response.status}")
            payload = json.load(response)
    except HTTPError as error:
        return finish("unavailable", error=f"HTTP {error.code}")
    except (URLError, TimeoutError):
        return finish("unavailable", error="network or timeout")
    except (json.JSONDecodeError, OSError):
        return finish("unavailable", error="invalid response")

    if not isinstance(payload, dict):
        return finish("unavailable", error="invalid response shape")
    if payload.get("error"):
        return finish("unavailable", error=f"logs API error: {safe_api_error(payload['error'])}")
    rows = payload.get("result")
    if not isinstance(rows, list) or not rows or not isinstance(rows[0], dict):
        return finish("unavailable", error="unexpected logs API response")

    keys = (
        "failed_signins",
        "repeat_failure_sources",
        "rate_limited_requests",
        "repeat_rate_limit_sources",
        "api_5xx",
        "db_errors",
        "permission_denials",
    )
    try:
        counts = {key: max(0, int(rows[0].get(key, 0) or 0)) for key in keys}
    except (TypeError, ValueError):
        return finish("unavailable", error="invalid aggregate values")

    # These thresholds identify patterns that merit review; they do not establish malicious intent.
    alert = (
        counts["failed_signins"] >= 25
        or counts["repeat_failure_sources"] > 0
        or counts["rate_limited_requests"] >= 25
        or counts["repeat_rate_limit_sources"] > 0
        or counts["permission_denials"] >= 20
    )
    return finish("review" if alert else "clear", counts=counts)

if __name__ == "__main__":
    sys.exit(main())
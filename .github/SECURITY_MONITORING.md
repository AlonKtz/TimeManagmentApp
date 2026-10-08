# Daily Supabase security activity report

The daily QA workflow queries Supabase unified logs for the previous 24 hours and includes aggregate indicators in the existing QA email and GitHub Actions summary. It does not copy raw logs, IP addresses, account identifiers, or email addresses into the report.

## Required GitHub secret

1. In Supabase, create a fine-grained Personal Access Token limited to this project, with only the analytics_logs_read permission.
2. In GitHub, open Settings, Secrets and variables, Actions, then New repository secret.
3. Set the name to SUPABASE_ACCESS_TOKEN and paste the token into GitHub's secret form. Do not put the token in the repository, a workflow file, or a chat message.
4. Run Actions, QA Daily Check, Run workflow once to confirm the report is connected.

The scan reports failed sign-in requests, repeated failures and rate limits from a source, API 5xx responses, database permission denials, and other database errors. Repeated patterns are triage signals, not proof of an attack. A missing token or failed log query is reported as unavailable and causes the QA workflow to fail visibly.

The existing .codex/agents/timey-security-auditor.toml is a local, read-only review agent. GitHub Actions cannot execute that local Codex agent by itself; the scheduled workflow runs the documented deterministic checks and reports their aggregated output. An LLM-generated incident analysis would require a separate model/API integration.
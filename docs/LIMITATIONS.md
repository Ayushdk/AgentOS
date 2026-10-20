# Current limitations

- AgentOS is a synthetic portfolio application, not a live HR system.
- Calendar meetings are fixtures. HR handoff creates an in-application ticket; it does not send email or chat messages.
- Gemini is optional and free-tier quota is provider-controlled.
- Render Free may cold-start. Readiness and GET retry are bounded and are not an SLA.
- The demonstration account switches among three fixed synthetic personas. This is not an enterprise impersonation feature.
- Anonymous visitor isolation exists in code but requires a dedicated synthetic Supabase environment.
- Backend scoping and restricted roles are implemented; the project does not claim a completed enterprise RLS audit.
- Policy management is read-only and sourced from versioned Markdown.
- The evaluation corpus is synthetic and does not establish production AI quality.
- A real rollout still needs SSO/SCIM, provisioning, retention controls, observability, abuse controls, backups, and independent security review.

# Evaluation guide

The frozen deterministic dataset contains 60 cases covering policy/citation, workflow, analytics, permission/injection, and recovery behavior. Development-mode runs exercise the same authorization, MCP, retrieval, SQL, and state-transition boundaries without depending on external model availability.

`evaluation/development.json` and `evaluation/final.json` contain the cases. `tests/test_evaluation.py` executes the contracts. `artifacts/evaluation-results.json` is tracked evidence from a recorded run and should not be treated as a live production benchmark.

Optional Gemini smoke evidence demonstrates connectivity and bounded grounded wording only. It does not replace deterministic regression coverage or establish production model quality.

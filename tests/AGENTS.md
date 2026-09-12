# Test scope

- Tests protect current behavior, security boundaries, observed regressions, or meaningful uncertainty.
- Prefer runtime behavior and public contract assertions over source formatting or completed migration checks.
- Use the Node project for pure/server/repository tests and the DOM project only when browser APIs or React rendering are required.
- Keep fixtures and helpers local to a domain unless the same semantic setup has at least three consumers.
- Run the narrowest affected project/file first, then the relevant repository gate before handoff.

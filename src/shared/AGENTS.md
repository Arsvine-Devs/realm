# Shared layer boundary

- Shared code MUST NOT import `src/app/`, `src/features/`, or legacy `src/pages/`.
- Put only stable cross-feature behavior here; feature-specific code stays in its feature.
- Keep hooks, UI, server helpers, contracts, and configuration in their existing semantic subdirectories.
- Prefer a direct existing owner over a new shared utility when there is only one consumer.
- Run the narrowest affected tests plus typecheck and lint when changing shared code.

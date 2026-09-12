# Navigation boundary

- Keep route classification, transition choreography, hash alignment, loading presentation, and locale state consistent with the current App Router runtime.
- Internal links managed by custom transitions must not opt into unrelated automatic prefetch behavior.
- Cleanup must reset transition surfaces, cancel stale alignment/animation work, and clear cursor or route state on unmount.
- Use `useTransition().navigateTo()` and `switchLocale()` for internal route changes.
- Prefer runtime behavior tests over source-string assertions; retain source contracts only where no meaningful runtime boundary exists.

# App Router scope

- Keep pages, layouts, metadata, and Route Handlers as framework adapters.
- Put domain behavior in `src/features/` or stable cross-feature behavior in `src/shared/`.
- Preserve the root client shell above `[locale]` so locale switching does not reset global HUD, music, WebGL, or navigation state.
- Route Handlers adapt `Request`/`Response`; they do not recreate legacy Next API request/response objects.
- Verify route, locale, prerender/ISR, and supported-method behavior when changing this scope.

# Navigation feature

[`Feature domains`](../README.md) · [`Repository map`](../../../INDEX.md)

The navigation feature owns route classification, transition choreography, hash alignment, locale switching, route loading presentation, and safe locale-independent page state.

- Internal route changes go through `navigateTo()` or `switchLocale()`.
- Transition and alignment cleanup is part of the feature contract.
- Read [`docs/human/ROUTING_AND_I18N.md`](../../../docs/human/ROUTING_AND_I18N.md) and [`AGENTS.md`](./AGENTS.md) before changing this scope.

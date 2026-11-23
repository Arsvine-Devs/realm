# Blog feature

[`Feature domains`](../README.md) · [`Repository map`](../../../INDEX.md)

The blog feature owns Markdown rendering, localized article variants, and access to protected posts and their attachments.

- Public route adaptation lives under `src/app/[locale]/blog/`.
- Protected content must remain runtime-gated through the grant and variant APIs.
- Read [`docs/human/CONTENT_AND_MDX.md`](../../../docs/human/CONTENT_AND_MDX.md), [`docs/human/SECURITY.md`](../../../docs/human/SECURITY.md), and [`AGENTS.md`](./AGENTS.md) before changing this scope.

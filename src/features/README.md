# Feature domains

`src/features/` groups product behavior by domain. A feature may contain `contracts/`, `model/`, `server/`, `ui/`, and `styles/` as its real responsibilities require.

Current high-risk domains have local entry points for assets, blog, and navigation. Other domains should remain self-contained without gaining a local document unless they acquire a distinct workflow or safety boundary.

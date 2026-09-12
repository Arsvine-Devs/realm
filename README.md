<div align="center">
  <h1>ARSVINE REALM</h1>
  <p>
    <a href="https://github.com/Arsvine-Realm-Dev-Team/arsvine-realm/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Arsvine-Realm-Dev-Team/arsvine-realm/actions/workflows/ci.yml/badge.svg" /></a>
    <a href="https://nodejs.org/"><img alt="Node.js 24.x" src="https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white" /></a>
    <a href="https://nextjs.org/"><img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white" /></a>
    <a href="https://arsvine.com"><img alt="Deployed on Vercel" src="https://img.shields.io/badge/deployed%20on-Vercel-000000?logo=vercel&logoColor=white" /></a>
    <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-2f855a.svg" /></a>
  </p>
  <p><em>A personal archive terminal for projects, writing, experiments, and the things still taking shape.</em></p>
  <p><img alt="ARSVINE REALM preview" src="./docs/preview.png" /></p>
  <p><strong>ARSVINE REALM</strong> is a post-apocalyptic HUD-themed portfolio and blog by <a href="https://github.com/ArsvineZhu">Arsvine Zhu</a>.</p>
  <p>
    <a href="https://arsvine.com">Visit the live site</a> ·
    <a href="https://github.com/Arsvine-Realm-Dev-Team/arsvine-realm">Browse the repository</a> ·
    <a href="./docs/README.md">Read the documentation</a>
  </p>
</div>

It combines a project archive, multilingual writing, life records, music, WebGL atmosphere, and a private-post access flow inside one living interface.

## What is inside

- A five-column HUD home screen and responsive content hub.
- Multilingual UI in `zh-CN`, `zh-TW`, and `en`, with additional blog content locales.
- Portfolio, experience, life, friends, tweets, RSS, sitemap, and robots routes.
- Smooth home/content/detail transitions with hash navigation and locale state retention.
- Desktop Three.js atmosphere and interaction with adaptive performance capabilities.
- A music player, custom cursor, spoiler controls, and accessible responsive interactions.
- Runtime-gated TOTP posts whose protected body never enters unauthorized static output.
- Versioned Tencent COS media Catalogs with immutable hashed objects and pointer-last publishing.

## Built with

`Next.js 16` · `React 19` · `TypeScript` · `SCSS Modules` · `next-intl` · `Three.js` · `React Three Fiber` · `GSAP` · `XState` · `MDX` · `Vitest`

## Run it locally

```bash
pnpm install --frozen-lockfile
pnpm dev
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Open `http://localhost:3000`.

## Explore further

- [Documentation index](./docs/README.md) — human-facing project and maintenance docs.
- [Repository map](./INDEX.md) — major code, tooling, and documentation boundaries.
- [AI workflow index](./docs/ai/INDEX.md) — repository skills, playbooks, and current invariants.
- [Security policy](./SECURITY.md) — responsible disclosure and production safety boundaries.
- [License](./LICENSE) — MIT for source code; original site content follows the policy shown in the site.

## Project status

The site is actively evolving as a personal archive rather than a generic starter template. Changes are checked by the repository CI workflow on Ubuntu and Windows; the production deployment runs on Vercel.

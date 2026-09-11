# Security Policy

This document defines how security issues should be reported for **Arsvine Realm**.

Arsvine Realm is a personal website and content system. It does not provide a public API, user account system, payment flow, or third-party user data processing at this stage. Security handling is therefore focused on protecting the public site, deployment configuration, content integrity, and private operational workflows.

## Supported Scope

Security reports are accepted for the current production version of the site and the latest code on the default branch.

| Target                                                                          | Supported |
| ------------------------------------------------------------------------------- | --------- |
| Current production site                                                         | Yes       |
| Latest default branch                                                           | Yes       |
| Preview deployments created by this repository                                  | Limited   |
| Archived branches or old experimental branches                                  | No        |
| Third-party services such as GitHub, Vercel, Cloudflare, or analytics providers | No        |

Preview deployments are considered in scope only when the issue is caused by this repository's code or configuration. Vulnerabilities in third-party platforms should be reported to the relevant vendor instead.

## What to Report

Please report issues such as:

- exposure of secrets, tokens, private URLs, or environment-specific credentials
- access control mistakes affecting protected or private content
- unintended exposure of draft, private, or administrative content
- XSS, injection, or unsafe rendering caused by this repository
- insecure redirect, header, caching, or deployment configuration
- dependency vulnerabilities that are directly exploitable in this project
- any issue that could affect site integrity, visitor safety, or private maintenance workflows

## Out of Scope

The following are generally out of scope:

- generic dependency alerts without a practical impact on this project
- automated scanner output without verification
- social engineering
- phishing simulations
- denial-of-service or stress testing
- excessive crawling, scraping, or bandwidth abuse
- attacks against GitHub, Vercel, Cloudflare, or other external providers
- issues requiring physical access to the maintainer's devices
- browser-specific warnings that do not create a practical security impact

## Reporting a Vulnerability

Please do **not** disclose security vulnerabilities through public issues, discussions, pull requests, or social media.

Preferred reporting method:

1. Use GitHub's private vulnerability reporting or Security Advisory feature if available.
2. Include a clear description of the issue.
3. Provide reproduction steps where possible.
4. Explain the practical impact.
5. Avoid accessing, copying, modifying, deleting, or disclosing private data.

If private reporting is not available, open a public issue with the title:

```txt
Security contact request
```

Do not include technical details in that issue. A private contact method will be arranged if necessary.

## Report Format

A useful report should include:

```txt
Summary:
A short description of the issue.

Affected area:
Page, route, component, configuration, dependency, or deployment behavior.

Steps to reproduce:
Minimal steps needed to verify the issue.

Impact:
What could an attacker or unauthorized user do?

Evidence:
Screenshots, logs, request examples, or proof-of-concept details.

Suggested fix:
Optional. Include only if you have a clear recommendation.
```

## Response Expectations

This is a personal project, so response times may vary.

Expected handling process:

1. The report is reviewed.
2. The issue is reproduced or assessed.
3. A fix or mitigation is planned if the report is valid.
4. The fix is applied through a commit or pull request.
5. Public disclosure may happen after the issue is resolved, if appropriate.

For severe issues involving leaked secrets, private content exposure, or deploy-time compromise, mitigation will be prioritized.

## Good-Faith Testing

Good-faith security research is welcome when it is limited, responsible, and does not harm the service or users.

Please do not:

- perform denial-of-service testing
- access or exfiltrate private content
- modify site content or repository data
- attempt persistence or privilege escalation beyond what is necessary to demonstrate the issue
- use automated high-volume scanners against the production site
- publicly disclose the vulnerability before it has been addressed

## No Bug Bounty

This project does not currently operate a paid bug bounty program.

Security reports are appreciated, but no monetary reward is offered unless explicitly stated elsewhere.

## Secret Handling

If you discover a leaked token, credential, private URL, or environment variable, report it privately and do not attempt to use it.

Exposed secrets may be rotated, revoked, or removed without public disclosure.

## Disclosure

Public disclosure should happen only after the vulnerability has been reviewed and fixed, or after a reasonable coordination period.

The maintainer may credit reporters in release notes, commit messages, or security advisories if requested and appropriate.

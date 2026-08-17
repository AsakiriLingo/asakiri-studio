# Security policy

## Reporting a vulnerability

Do not open a public issue.

Use GitHub's private reporting: **Security → Report a vulnerability** on
[the repository](https://github.com/AsakiriLingo/asakiri-studio/security/advisories/new).
If that is not available to you, email **alok@asakiri.com** with "security" in the subject.

Please include what an attacker can achieve, the steps to reproduce it, the Studio version
and operating system, and a proof of concept if you have one.

This is a small project maintained around other work. Expect an acknowledgement within about
a week, and a fix in the next release once we agree on the severity. You will be credited in
the release notes unless you prefer not to be. There is no bug bounty.

## Supported versions

Only the latest release receives fixes. Studio is pre-1.0, so there are no maintenance
branches for older versions.

| Version        | Supported         |
| -------------- | ----------------- |
| Latest release | Yes               |
| Anything older | No, upgrade first |

## What Studio is, in security terms

Studio is an unsandboxed desktop application with no server, no accounts, and no telemetry. A
course is plain files in a directory you choose. That shapes the threat model: there is no
backend to attack and no shared data between users, but the app holds arbitrary filesystem
access and runs a few native operations.

Things we consider security-relevant:

- **Path escapes.** Every Rust command that touches course files resolves paths against the
  project root and refuses to read or write outside it. A way around that guard is a
  vulnerability.
- **The updater.** Updates are minisign-signed and the app refuses to install a build it
  cannot verify. Anything that lets an unsigned or substituted build install is critical.
- **Course files as untrusted input.** A course may come from someone else, so the parser
  must fail safely on malformed or hostile JSON. Crashes are bugs; anything that reads or
  writes outside the project, or executes, is a vulnerability.
- **Media import.** Images are stripped of metadata, including EXIF GPS, on the way in. A
  path that silently preserves it is a privacy bug; report it privately.
- **Outbound requests.** Studio contacts the network in exactly three situations, all
  user-visible: the update check, an Unsplash image search, and a Tatoeba audio search. The
  search and download commands enforce HTTPS and an allowlist of four hosts
  (`unsplash.com`, `images.unsplash.com`, `tatoeba.org`, `audio.tatoeba.org`); anything else
  is refused. Speech synthesis and recording are on-device. Course content is never uploaded.
  A way to make Studio fetch an arbitrary host, or any unexpected outbound request, is a
  vulnerability.
- **Git.** Creating a course shells out to `git init`. Argument or path injection there is in
  scope.

## Out of scope

- Windows installers are currently unsigned, so SmartScreen warns on install. This is a known
  gap tracked in [docs/APP-DISTRIBUTION.md](docs/APP-DISTRIBUTION.md), not a vulnerability
  report.
- The app is deliberately unsandboxed and can read and write any directory you point it at.
  That is the design, and the reasoning is in the distribution record.
- Vulnerabilities in dependencies with no exploitable path in Studio. Report those upstream,
  though a note here is welcome if you believe we reach the vulnerable code.
- Anything requiring an attacker who already has local code execution as your user.

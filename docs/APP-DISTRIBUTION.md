# App distribution and update decision record

Status: **Accepted 2026-08-09**. Asakiri Studio ships as a directly-distributed Tauri desktop app with a built-in updater. The Mac App Store is out of scope.

This record covers how users install the desktop app and how it updates itself. It is separate from course distribution (course versioning in [VERSIONING.md](VERSIONING.md) and the website's course registry) and concerns only the application binary.

## Decision

- Distribute the app directly, with GitHub Releases as the source of truth for both first-install downloads and updates.
- Update in place with the Tauri updater plugin, checking a static manifest and installing signed builds.
- Build, sign, and publish all platforms from CI on a version tag.
- Do not ship to the Mac App Store.

## Pipeline

```
git tag vX.Y.Z
   │
   ▼
GitHub Actions (tauri-action)
   ├─ builds macOS, Windows, Linux
   ├─ code-signs + notarizes macOS; signs updater artifacts (minisign)
   └─ publishes installers + latest.json to the GitHub Release
        │
        ├── website download page ──► installer (first install)
        └── latest.json endpoint  ──► running app checks, verifies signature, installs (update)
```

The app version is the "app version" row in [VERSIONING.md](VERSIONING.md), independent of `formatVersion` and course release versions.

## Getting it (first install)

- Primary: an OS-detecting download page on asakiri.com linking the latest GitHub Release asset.
- GitHub Releases directly, for open-source users.
- Deferred secondary channels: Homebrew cask, winget or Scoop, Flathub or AUR.

## Updating it

- `@tauri-apps/plugin-updater`, with the update feed being `latest.json` on the GitHub Release.
- UX: check on launch (and periodically), then notify and let the user approve the install, showing the changelog. Not silent auto-update. The auto-check is toggleable, and the app is transparent that the check contacts the update endpoint.

## Signing (required, per platform)

| Platform         | Requirement                                             | Status                                                |
| ---------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Updater (all OS) | minisign keypair (`tauri signer generate`)              | Required; private key + password stored as CI secrets |
| macOS            | Apple Developer ID certificate + notarization (~$99/yr) | Budgeted; without it Gatekeeper blocks the app        |
| Windows          | Code-signing certificate (or Azure Trusted Signing)     | Deferred; accept SmartScreen warnings initially       |
| Linux            | AppImage; no signing gate                               | Updater-friendly                                      |

The minisign updater signing is free and non-negotiable, since the updater will not install unsigned builds.

## Why not the Mac App Store

MAS would add discovery and store-managed updates, and the store fee is irrelevant while the app is free. It is declined because it mandates the App Sandbox, which conflicts with how Studio works today and adds ongoing cost:

- Sandboxed apps cannot spawn external binaries, so `create_course`'s `git init` would have to be dropped or replaced with a bundled library.
- Free filesystem access to course directories would need reworking to security-scoped bookmarks, which Tauri v2 supports poorly.
- App Review adds delay and rejection risk to every release.
- MAS builds cannot use the Tauri updater, so we would maintain two update paths plus a separate sandboxed build variant.

Staying off MAS keeps the app unsandboxed: it can shell out to `git` and use absolute paths, and one updater serves every platform. If Mac discovery later becomes the main growth bottleneck, MAS can be revisited as a second channel after the sandbox rework.

## v1 scope

1. A `tauri-action` release workflow: build all platforms on tag, publish to GitHub Releases, emit `latest.json`.
2. The updater plugin wired to the GitHub Release manifest, with a notify-and-approve in-app flow that shows the changelog.
3. Generate the minisign updater key.
4. Apple Developer account and notarization in CI.
5. An OS-detecting download page on asakiri.com.

## Open follow-ups

- When to add Windows code signing.
- Package-manager channels (Homebrew cask, winget).
- A beta channel (for example, for Patreon supporters), which would move the update manifest to asakiri.com for channel routing.

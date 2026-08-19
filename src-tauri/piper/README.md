# Piper TTS engine (bundled resource)

This folder is bundled into the app as a Tauri resource (`bundle.resources` in
`tauri.conf.json`) and resolved at runtime via `resource_dir()/piper`.

Committed here: `voices.json` (the downloadable-voice catalog snapshot) and this
README. The engine binaries are **not** committed — the release workflow
downloads the right one per platform at build time (see below). For local dev
you drop them in by hand.

## Upstream source (important)

The standalone Piper binaries come from **`rhasspy/piper`**, which is now
**archived**. We pin its last release, `2023.11.14-2`; the assets still download
and its `piper --model X.onnx --output_file Y.wav` CLI is what
`src-tauri/src/tts.rs` shells out to.

Active development has moved to **`OHF-Voice/piper1-gpl`**, but that project now
ships as **Python wheels** (`pip install piper-tts`), not standalone native
binaries — adopting it means bundling a Python runtime and changing the Rust
invocation. That is a future migration, tracked separately. The voice models and
catalog (`rhasspy/piper-voices` on HuggingFace) are unchanged across both.

## Engine (added at build time, per platform)

The release workflow (`.github/workflows/release.yml`) downloads and extracts the
matching archive from `https://github.com/rhasspy/piper/releases/tag/2023.11.14-2`
into this folder before the Tauri build. On macOS it `lipo`s the x64 + arm64
binaries into a universal one and Developer-ID signs the nested binaries so the
notarized app bundle passes.

For a local build, do the same by hand:

```
src-tauri/piper/
  piper(.exe)          # `piper.exe` on Windows, `piper` on macOS/Linux
  espeak-ng-data/      # ships inside the piper release archive
  <the .dll / .dylib / .so files from the archive>
```

## Voice models (downloaded on demand, in app)

Voices are downloaded from inside the app (Media → Add TTS audio → Manage
voices), into the Tauri `app_data_dir()`:

- Windows: `%APPDATA%\com.asakiri.studio\piper\voices`
- macOS: `~/Library/Application Support/com.asakiri.studio/piper/voices`
- Linux: `~/.local/share/com.asakiri.studio/piper/voices`

To place one by hand, drop a matching `*.onnx` + `*.onnx.json` pair (from
https://huggingface.co/rhasspy/piper-voices) into that folder. The file stem
(e.g. `en_US-amy-medium`) is the voice id the app lists and synthesizes with.

## Notes

- Synthesized audio is written as `.wav` (a supported media type).
- On macOS/Linux the app marks the binary executable at runtime.
- Do not commit the engine binaries or `.onnx` models to git.

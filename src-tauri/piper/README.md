# Piper TTS engine (bundled resource)

This folder is bundled into the app as a Tauri resource (`bundle.resources` in
`tauri.conf.json`) and resolved at runtime via `resource_dir()/piper`.

Committed here: `voices.json` (the downloadable-voice catalog snapshot) and this
README. The engine is **not** committed — the release workflow builds it from
source per platform at build time (see below). For local dev you build/copy it
in by hand.

## Engine source

Built from **OHF-Voice/piper1-gpl** (the maintained Piper, `libpiper`), pinned to
`v1.7.0`. Its CMake build compiles espeak-ng from source and downloads the
onnxruntime shared library. `src-tauri/src/tts.rs` shells out to the resulting
`piper_exe` CLI (`--model X.onnx --output_file Y.wav --espeak_data <dir>`, text
on stdin), which writes a `.wav`.

The archived `rhasspy/piper` project is no longer used (it is archived, its macOS
release was missing its dylibs, and it shipped no native arm64 macOS build).

## Build (done at release time, per platform)

The release workflow (`.github/workflows/release.yml`) runs, for each platform:

```
cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=install
cmake --build build --config Release
cmake --install build
```

then copies `piper_exe`, `libpiper`, `libonnxruntime`, and `espeak-ng-data` into
this folder, sets loader-relative rpaths, and (on macOS) Developer-ID signs the
binaries so the notarized app passes.

**macOS is arm64 only.** The engine is built natively on the Apple Silicon
runner. The app bundle stays universal, so TTS runs natively on Apple Silicon
and is unavailable on Intel Macs. Linux is x86_64, Windows is amd64.

For a local build, do the same by hand (`libpiper/README.md` upstream has the
steps) and drop `piper_exe(.exe)`, its shared libs, and `espeak-ng-data/` here.

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

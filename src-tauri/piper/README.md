# Piper TTS engine (bundled resource)

This folder is bundled into the app as a Tauri resource (`bundle.resources` in
`tauri.conf.json`) and resolved at runtime via `resource_dir()/piper`.

Phase 1 does not download anything automatically. To try text to speech end to
end you place the engine here and one voice model in app data.

## 1. Engine (goes in this folder, per platform build)

Download a Piper release for the platform you are building for from
https://github.com/rhasspy/piper/releases and place:

```
src-tauri/piper/
  piper.exe            # Windows build   (or `piper` on macOS/Linux)
  espeak-ng-data/      # ships inside the piper release archive
  <the other .dll / .so files from the archive>
```

Ship the binary that matches the target you build (`piper.exe` for a Windows
installer, `piper` for macOS/Linux). Keep the `espeak-ng-data` folder next to it.

## 2. A test voice model (goes in app data, not here)

Voice models are downloaded on demand in a later phase. For phase 1, drop one
model pair into the app data voices folder by hand:

```
<app data>/piper/voices/
  en_US-amy-medium.onnx
  en_US-amy-medium.onnx.json
```

`<app data>` is the Tauri `app_data_dir()`:

- Windows: `%APPDATA%\com.asakiri.studio\piper\voices`
- macOS: `~/Library/Application Support/com.asakiri.studio/piper/voices`
- Linux: `~/.local/share/com.asakiri.studio/piper/voices`

Models: https://huggingface.co/rhasspy/piper-voices (grab a `*.onnx` and its
matching `*.onnx.json`). The file stem (e.g. `en_US-amy-medium`) is the voice id
the app lists and passes back to synthesize.

## Notes

- Synthesized audio is written as `.wav` (a supported media type).
- On macOS/Linux the app marks the binary executable at runtime.
- Do not commit the large engine binaries or `.onnx` models to git.

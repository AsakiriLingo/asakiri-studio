use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::Manager;

#[derive(Serialize)]
pub struct TtsVoice {
    name: String,
    locale: String,
}

fn unique_stamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|delta| delta.as_nanos())
        .unwrap_or(0)
}

fn piper_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .resource_dir()
        .map_err(|error| error.to_string())?
        .join("piper"))
}

fn piper_binary(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let name = if cfg!(windows) { "piper_exe.exe" } else { "piper_exe" };
    let binary = piper_dir(app)?.join(name);
    if !binary.exists() {
        return Err("piperMissing".to_string());
    }
    Ok(binary)
}

fn voices_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("piper")
        .join("voices"))
}

fn locale_from_voice_id(voice_id: &str) -> String {
    voice_id.split('-').next().unwrap_or(voice_id).to_string()
}

fn is_safe_voice_id(voice_id: &str) -> bool {
    !voice_id.is_empty()
        && voice_id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || matches!(character, '_' | '-'))
}

#[cfg(unix)]
fn ensure_executable(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(metadata) = fs::metadata(path) {
        let mut permissions = metadata.permissions();
        permissions.set_mode(permissions.mode() | 0o111);
        let _ = fs::set_permissions(path, permissions);
    }
}

#[cfg(not(unix))]
fn ensure_executable(_path: &Path) {}

#[tauri::command]
pub fn list_tts_voices(app: tauri::AppHandle) -> Result<Vec<TtsVoice>, String> {
    let dir = voices_dir(&app)?;
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut voices = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|error| error.to_string())?.flatten() {
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("onnx") {
            continue;
        }
        let stem = match path.file_stem().and_then(|value| value.to_str()) {
            Some(value) => value.to_string(),
            None => continue,
        };
        if !path.with_extension("onnx.json").exists() {
            continue;
        }
        let locale = locale_from_voice_id(&stem);
        voices.push(TtsVoice { name: stem, locale });
    }
    voices.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(voices)
}

#[tauri::command]
pub fn synthesize_tts(
    app: tauri::AppHandle,
    text: String,
    voice: String,
    file_name: String,
) -> Result<String, String> {
    let target = synthesize_to_temp(&app, &text, &voice, &file_name)?;
    target
        .to_str()
        .map(|path| path.to_string())
        .ok_or_else(|| "unknown".to_string())
}

#[tauri::command]
pub fn preview_tts(app: tauri::AppHandle, text: String, voice: String) -> Result<String, String> {
    let target = synthesize_to_temp(&app, &text, &voice, "preview.wav")?;
    let bytes = fs::read(&target).map_err(|error| error.to_string())?;
    let _ = fs::remove_file(&target);
    Ok(format!("data:audio/wav;base64,{}", STANDARD.encode(&bytes)))
}

fn synthesize_to_temp(
    app: &tauri::AppHandle,
    text: &str,
    voice: &str,
    file_name: &str,
) -> Result<PathBuf, String> {
    if text.trim().is_empty() {
        return Err("emptyText".to_string());
    }
    let voice = voice.trim();
    if voice.is_empty() {
        return Err("voiceMissing".to_string());
    }
    if !is_safe_voice_id(voice) {
        return Err("voiceMissing".to_string());
    }

    let model = voices_dir(app)?.join(format!("{voice}.onnx"));
    if !model.exists() {
        return Err("voiceMissing".to_string());
    }

    let safe_name: String = file_name
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, '.' | '-' | '_'))
        .collect();
    let safe_name = if safe_name.to_lowercase().ends_with(".wav") {
        safe_name
    } else {
        format!("{}.wav", if safe_name.is_empty() { "tts-audio" } else { &safe_name })
    };

    let mut dir: PathBuf = std::env::temp_dir();
    dir.push(format!("asakiri-tts-{}", unique_stamp()));
    fs::create_dir_all(&dir).map_err(|_| "unknown".to_string())?;
    let target = dir.join(&safe_name);

    let binary = piper_binary(app)?;
    ensure_executable(&binary);

    let mut command = Command::new(&binary);
    command.arg("--model").arg(&model);
    command.arg("--output_file").arg(&target);
    let espeak_data = piper_dir(app)?.join("espeak-ng-data");
    if espeak_data.exists() {
        command.arg("--espeak_data").arg(&espeak_data);
    }
    command.stdin(Stdio::piped());
    command.stdout(Stdio::null());
    command.stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|error| error.to_string())?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(text.as_bytes())
            .map_err(|error| error.to_string())?;
    }
    let output = child.wait_with_output().map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    if !target.exists() {
        return Err("ttsFailed".to_string());
    }

    Ok(target)
}

const VOICES_BASE_URL: &str = "https://huggingface.co/rhasspy/piper-voices/resolve/main/";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogVoice {
    id: String,
    name: String,
    quality: String,
    language_code: String,
    language_english: String,
    language_native: String,
    region: String,
    country: String,
    size_bytes: u64,
    sample_url: String,
    installed: bool,
}

fn read_catalog(
    app: &tauri::AppHandle,
) -> Result<serde_json::Map<String, serde_json::Value>, String> {
    let path = piper_dir(app)?.join("voices.json");
    let text = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let value: serde_json::Value = serde_json::from_str(&text).map_err(|error| error.to_string())?;
    value
        .as_object()
        .cloned()
        .ok_or_else(|| "badCatalog".to_string())
}

struct RemoteFile {
    path: String,
    md5: String,
    size: u64,
}

fn remote_files(entry: &serde_json::Value) -> Option<(RemoteFile, RemoteFile)> {
    let files = entry.get("files")?.as_object()?;
    let mut model = None;
    let mut config = None;
    for (path, meta) in files {
        let file = RemoteFile {
            path: path.clone(),
            md5: meta
                .get("md5_digest")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string(),
            size: meta
                .get("size_bytes")
                .and_then(|value| value.as_u64())
                .unwrap_or(0),
        };
        if path.ends_with(".onnx.json") {
            config = Some(file);
        } else if path.ends_with(".onnx") {
            model = Some(file);
        }
    }
    Some((model?, config?))
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    downloaded: u64,
    total: u64,
}

fn download_verified(
    url: &str,
    target: &Path,
    expected_md5: &str,
    channel: &Channel<DownloadProgress>,
    downloaded: &mut u64,
    total: u64,
) -> Result<(), String> {
    let response = ureq::get(url).call().map_err(|error| error.to_string())?;
    let mut reader = response.into_reader();
    let mut file = fs::File::create(target).map_err(|error| error.to_string())?;
    let mut context = md5::Context::new();
    let mut buffer = [0u8; 65536];
    loop {
        let read = reader.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        file.write_all(&buffer[..read])
            .map_err(|error| error.to_string())?;
        context.consume(&buffer[..read]);
        *downloaded += read as u64;
        let _ = channel.send(DownloadProgress {
            downloaded: *downloaded,
            total,
        });
    }
    if !expected_md5.is_empty() {
        let digest = format!("{:x}", context.compute());
        if !digest.eq_ignore_ascii_case(expected_md5) {
            return Err("checksumMismatch".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn list_available_voices(app: tauri::AppHandle) -> Result<Vec<CatalogVoice>, String> {
    let catalog = read_catalog(&app)?;
    let dir = voices_dir(&app)?;
    let mut voices = Vec::new();
    for (id, entry) in catalog.iter() {
        let language = entry.get("language");
        let language_field = |key: &str| {
            language
                .and_then(|value| value.get(key))
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string()
        };
        let mut size_bytes = 0u64;
        let mut sample_url = String::new();
        if let Some(files) = entry.get("files").and_then(|value| value.as_object()) {
            for (path, meta) in files {
                if path.ends_with(".onnx") {
                    size_bytes = meta.get("size_bytes").and_then(|value| value.as_u64()).unwrap_or(0);
                    if let Some((parent, _)) = path.rsplit_once('/') {
                        sample_url = format!("{VOICES_BASE_URL}{parent}/samples/speaker_0.mp3");
                    }
                }
            }
        }
        voices.push(CatalogVoice {
            id: id.clone(),
            name: entry
                .get("name")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string(),
            quality: entry
                .get("quality")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string(),
            language_code: language_field("code"),
            language_english: language_field("name_english"),
            language_native: language_field("name_native"),
            region: language_field("region"),
            country: language_field("country_english"),
            size_bytes,
            sample_url,
            installed: dir.join(format!("{id}.onnx")).exists(),
        });
    }
    voices.sort_by(|left, right| {
        left.language_english
            .cmp(&right.language_english)
            .then(left.name.cmp(&right.name))
            .then(left.quality.cmp(&right.quality))
    });
    Ok(voices)
}

#[tauri::command]
pub async fn download_voice(
    app: tauri::AppHandle,
    voice_id: String,
    on_progress: Channel<DownloadProgress>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || download_voice_blocking(&app, &voice_id, &on_progress))
        .await
        .map_err(|error| error.to_string())?
}

fn download_voice_blocking(
    app: &tauri::AppHandle,
    voice_id: &str,
    on_progress: &Channel<DownloadProgress>,
) -> Result<(), String> {
    if !is_safe_voice_id(voice_id) {
        return Err("voiceUnknown".to_string());
    }
    let catalog = read_catalog(app)?;
    let entry = catalog.get(voice_id).ok_or_else(|| "voiceUnknown".to_string())?;
    let (model, config) = remote_files(entry).ok_or_else(|| "voiceUnknown".to_string())?;

    let dir = voices_dir(app)?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let model_target = dir.join(format!("{voice_id}.onnx"));
    let config_target = dir.join(format!("{voice_id}.onnx.json"));

    let total = model.size + config.size;
    let mut downloaded = 0u64;

    if let Err(error) = download_verified(
        &format!("{VOICES_BASE_URL}{}", model.path),
        &model_target,
        &model.md5,
        on_progress,
        &mut downloaded,
        total,
    ) {
        let _ = fs::remove_file(&model_target);
        return Err(error);
    }
    if let Err(error) = download_verified(
        &format!("{VOICES_BASE_URL}{}", config.path),
        &config_target,
        &config.md5,
        on_progress,
        &mut downloaded,
        total,
    ) {
        let _ = fs::remove_file(&model_target);
        let _ = fs::remove_file(&config_target);
        return Err(error);
    }
    Ok(())
}

#[tauri::command]
pub fn remove_voice(app: tauri::AppHandle, voice_id: String) -> Result<(), String> {
    if !is_safe_voice_id(&voice_id) {
        return Err("voiceUnknown".to_string());
    }
    let dir = voices_dir(&app)?;
    for suffix in ["onnx", "onnx.json"] {
        let path = dir.join(format!("{voice_id}.{suffix}"));
        if path.exists() {
            fs::remove_file(&path).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{is_safe_voice_id, locale_from_voice_id};

    #[test]
    fn derives_locale_from_voice_id() {
        assert_eq!(locale_from_voice_id("cy_GB-gwryw-medium"), "cy_GB");
        assert_eq!(locale_from_voice_id("en_US-amy-low"), "en_US");
    }

    #[test]
    fn falls_back_to_whole_id_without_separator() {
        assert_eq!(locale_from_voice_id("plainvoice"), "plainvoice");
    }

    #[test]
    fn accepts_real_voice_ids() {
        assert!(is_safe_voice_id("en_US-amy-low"));
        assert!(is_safe_voice_id("cy_GB-gwryw-medium"));
    }

    #[test]
    fn rejects_voice_ids_that_could_traverse_paths() {
        assert!(!is_safe_voice_id(""));
        assert!(!is_safe_voice_id("../escape"));
        assert!(!is_safe_voice_id("a/b"));
        assert!(!is_safe_voice_id("a\\b"));
        assert!(!is_safe_voice_id("voice.name"));
    }
}

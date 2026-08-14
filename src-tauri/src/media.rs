use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;

const ALLOWED_HOSTS: &[&str] = &[
    "unsplash.com",
    "images.unsplash.com",
    "tatoeba.org",
    "audio.tatoeba.org",
];

const USER_AGENT: &str = "AsakiriStudio/0.1 (+media-search)";

fn host_allowed(url: &str) -> bool {
    let Some(rest) = url.strip_prefix("https://") else {
        return false;
    };
    let host = rest.split(['/', '?', '#']).next().unwrap_or("");
    ALLOWED_HOSTS.iter().any(|allowed| host == *allowed)
}

fn unique_stamp() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|delta| delta.as_nanos())
        .unwrap_or(0)
}

#[tauri::command]
pub fn http_get_text(url: String) -> Result<String, String> {
    if !host_allowed(&url) {
        return Err("hostNotAllowed".to_string());
    }
    let response = ureq::get(&url)
        .set("User-Agent", USER_AGENT)
        .set("Accept", "application/json")
        .call()
        .map_err(|error| error.to_string())?;
    response.into_string().map_err(|error| error.to_string())
}

fn write_temp_file(file_name: &str, bytes: &[u8]) -> Result<String, String> {
    let safe_name: String = file_name
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, '.' | '-' | '_'))
        .collect();
    let safe_name = if safe_name.is_empty() {
        "recording".to_string()
    } else {
        safe_name
    };

    let mut dir: PathBuf = std::env::temp_dir();
    dir.push(format!("asakiri-media-{}", unique_stamp()));
    fs::create_dir_all(&dir).map_err(|_| "unknown".to_string())?;
    let target = dir.join(&safe_name);
    fs::write(&target, bytes).map_err(|_| "unknown".to_string())?;

    target
        .to_str()
        .map(|path| path.to_string())
        .ok_or_else(|| "unknown".to_string())
}

#[tauri::command]
pub fn write_temp_media(file_name: String, data_base64: String) -> Result<String, String> {
    let bytes = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|_| "decodeFailed".to_string())?;
    if bytes.is_empty() {
        return Err("emptyRecording".to_string());
    }
    write_temp_file(&file_name, &bytes)
}

#[tauri::command]
pub fn download_media_file(url: String, file_name: String) -> Result<String, String> {
    if !host_allowed(&url) {
        return Err("hostNotAllowed".to_string());
    }
    let response = ureq::get(&url)
        .set("User-Agent", USER_AGENT)
        .call()
        .map_err(|error| error.to_string())?;

    let mut bytes: Vec<u8> = Vec::new();
    response
        .into_reader()
        .read_to_end(&mut bytes)
        .map_err(|_| "downloadFailed".to_string())?;

    let safe_name: String = file_name
        .chars()
        .filter(|character| character.is_alphanumeric() || matches!(character, '.' | '-' | '_'))
        .collect();
    let safe_name = if safe_name.is_empty() {
        "download".to_string()
    } else {
        safe_name
    };

    let mut dir: PathBuf = std::env::temp_dir();
    dir.push(format!("asakiri-media-{}", unique_stamp()));
    fs::create_dir_all(&dir).map_err(|_| "unknown".to_string())?;
    let target = dir.join(&safe_name);
    fs::write(&target, &bytes).map_err(|_| "unknown".to_string())?;

    target
        .to_str()
        .map(|path| path.to_string())
        .ok_or_else(|| "unknown".to_string())
}
